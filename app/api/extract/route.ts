import { NextResponse } from 'next/server';
import { Type } from '@google/genai';
import { JobExtractionSchema } from '../../../lib/schemas/extraction';
import { createClient } from '../../../lib/supabase/server';
import { getAvailableModel, AllModelsExhaustedError, parseGeminiError, blockModelInDb, AI_MODELS, ParsedAiError } from '../../../lib/ai/models';
import { createServiceClient } from '../../../lib/supabase/serviceClient';
import { getProvider, AiProvider } from '../../../lib/ai/provider';
import { decrypt } from '../../../lib/utils/encryption';

const geminiSchema = {
  type: Type.OBJECT,
  properties: {
    company_name: { type: Type.STRING, description: "The hiring company's name, usually the first proper noun in the posting, sometimes followed by a star rating or review count" },
    role: { type: Type.STRING, description: "The job title as posted, including any qualifiers like Jr./Sr. or seniority level" },
    tech_stack: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "All programming languages, frameworks, databases, and technical tools explicitly mentioned in requirements or responsibilities, as individual items — split combined mentions like 'C#, C/C++' into separate entries"
    },
    salary_min: { type: Type.NUMBER, nullable: true, description: "The minimum compensation figure as a clean number, e.g. 60000. Null if no salary is stated." },
    salary_max: { type: Type.NUMBER, nullable: true, description: "The maximum compensation figure as a clean number, e.g. 90000. If it's a fixed salary instead of a range, set this equal to salary_min. Null if no salary is stated." },
    currency: { type: Type.STRING, description: "The 3-letter currency code of the salary (e.g., 'PHP', 'USD', 'EUR'). Guessed from currency symbols (₱, $, €), location, or explicit mentions. Default to 'PHP' if completely ambiguous." },
    location: { type: Type.STRING, nullable: true, description: "City/region and remote/hybrid status where the job is based. This often appears as a standalone line near the top (e.g. 'Makati City, Metro Manila') even without an explicit 'Location:' label, and may also be restated later in requirements as a willingness-to-work clause — check the entire posting, not just the header" },
    source: { type: Type.STRING, nullable: true, description: "Where this posting was found or published, if mentioned (e.g. job board name)" },
    recruiter_name: { type: Type.STRING, nullable: true, description: "Name of a specific recruiter or hiring contact person, if named" },
    contact_info: { type: Type.STRING, nullable: true, description: "Email address or LinkedIn URL for application or inquiries, if present" },
    notes: { type: Type.STRING, nullable: true, description: "Any other noteworthy details not captured by other fields — e.g. training programs, work schedule, unusual requirements" },
  },
  required: ['company_name', 'role', 'tech_stack'],
};

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (!user || authError) {
      return NextResponse.json(
        { error: 'Unauthorized. Please authenticate to use this API.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { jobDescription, model: requestedModel } = body;

    if (!jobDescription || typeof jobDescription !== 'string') {
      return NextResponse.json(
        { error: 'jobDescription is required and must be a string.', partialData: null },
        { status: 400 }
      );
    }

    // --- Provider and BYOK Setup ---
    let aiProvider: AiProvider | null = null;
    let hasCustomKey = false;

    // 1. Fetch user's preferred provider
    const { data: profile } = await supabase
      .from('profiles')
      .select('preferred_provider')
      .eq('id', user.id)
      .single();
    
    const preferredProvider = profile?.preferred_provider;

    // 2. Look for custom key if preferred_provider is set
    if (preferredProvider) {
      const { data: keyData } = await supabase
        .from('user_api_keys')
        .select('encrypted_key, iv, auth_tag')
        .eq('user_id', user.id)
        .eq('provider', preferredProvider)
        .single();

      if (keyData) {
        let decryptedKey: string | null = null;
        try {
          decryptedKey = decrypt({
            encryptedKey: keyData.encrypted_key,
            iv: keyData.iv,
            authTag: keyData.auth_tag
          });
        } catch (decryptErr) {
          console.error(`[Extract API] Decryption failed for user ${user.id}:`, decryptErr);
          return NextResponse.json(
            { error: 'Decryption failed. Your API key could not be read. Please re-enter your key in your profile.' },
            { status: 401 }
          );
        }

        if (decryptedKey) {
          try {
            aiProvider = getProvider(preferredProvider, decryptedKey);
            hasCustomKey = true;
          } catch (providerErr) {
            console.error(`[Extract API] Provider instantiation failed for ${preferredProvider}:`, providerErr);
            // Fall back to server key by leaving hasCustomKey = false
          }
        }
      }
    }

    // 3. Fallback path if no custom provider/key is configured or getProvider failed
    if (!hasCustomKey) {
      if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ error: 'GEMINI_API_KEY is not set. Please check your .env.local file.', partialData: null }, { status: 500 });
      }
      try {
        aiProvider = getProvider('google', process.env.GEMINI_API_KEY);
      } catch (err) {
        console.error('[Extract API] Fallback provider instantiation failed:', err);
        return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
      }
    }

    // --- End BYOK Setup ---

    const oneShotExample = `

check the full posting text for each field, not just labeled sections — fields are often stated implicitly.

Example Input:
Acme Corp is hiring a Frontend Engineer to build modern web apps. We offer competitive pay of ₱60,000-₱90,000. You'll use React, TypeScript, and TailwindCSS to build features. The ideal candidate is a team player who must be willing to work in our office in BGC, Taguig at least 3 days a week.

Example Output:
{
  "company_name": "Acme Corp",
  "role": "Frontend Engineer",
  "tech_stack": [
    "React",
    "TypeScript",
    "TailwindCSS"
  ],
  "salary_min": 60000,
  "salary_max": 90000,
  "currency": "PHP",
  "location": "BGC, Taguig",
  "source": null,
  "recruiter_name": null,
  "contact_info": null,
  "notes": "Hybrid (3 days a week in office)"
}`;

    const systemInstruction1 = 'You are an expert ATS data extraction AI. Extract the job details from the provided job description. Ensure the output strictly follows the requested JSON schema. If information is missing, leave the nullable fields as null.' + oneShotExample;
    const systemInstruction2 = 'You are an expert ATS data extraction AI. Extract the following exact fields: company_name (string), role (string), tech_stack (array of strings), salary_min (number or null), salary_max (number or null), currency (string), location (string or null), source (string or null), recruiter_name (string or null), contact_info (string or null), notes (string or null). You MUST return valid JSON matching this structure exactly. Missing fields MUST be null, not omitted.' + oneShotExample;

    const serviceSupabase = createServiceClient();
    const excludedModels: string[] = [];
    let attempts = 0;
    const maxAttempts = AI_MODELS.length;
    let lastError: ParsedAiError | null = null;

    while (attempts < maxAttempts) {
      attempts++;
      let activeModelName: string;

      try {
        // NOTE: Since /api/extract and /api/match may run concurrently in parallel, 
        // there is no strict guarantee both requests resolve to the identical model under simultaneous fallback.
        // This is an intentional performance tradeoff for parallel execution speed.
        activeModelName = await getAvailableModel(user.id, excludedModels, requestedModel, hasCustomKey);
      } catch (e: unknown) {
        if (e instanceof AllModelsExhaustedError) {
          return NextResponse.json({
            error: 'all_models_exhausted',
            retryAfterSeconds: e.retryAfterSeconds
          }, { status: 429 });
        }
        throw e;
      }

      const executeModelCall = async (instruction: string): Promise<string> => {
        // aiProvider is guaranteed to be set here either from custom key or fallback
        return await aiProvider!.generateObject(instruction, geminiSchema, activeModelName, jobDescription);
      };

      const parseAndValidate = (rawText: string) => {
        const firstBrace = rawText.indexOf('{');
        const lastBrace = rawText.lastIndexOf('}');
        if (firstBrace === -1 || lastBrace === -1) throw new Error("No JSON object found in response");
        const cleanedText = rawText.slice(firstBrace, lastBrace + 1);
        const parsed = JSON.parse(cleanedText);
        return JobExtractionSchema.parse(parsed);
      };

      try {
        let rawJsonText = "";
        try {
          rawJsonText = await executeModelCall(systemInstruction1);
          const validated = parseAndValidate(rawJsonText);
          if (!hasCustomKey) {
            await serviceSupabase.rpc('increment_model_usage', { p_model_name: activeModelName });
          }
          return NextResponse.json({ data: validated, model_used: activeModelName });
        } catch (err1: unknown) {
          const parsed1 = parseGeminiError(err1);
          if (parsed1.isQuotaError || parsed1.isUnavailableError || parsed1.statusCode === 400 || parsed1.statusCode === 401 || parsed1.statusCode === 403) {
            throw err1; // Trigger model fallback loop or auth exit
          }
          console.error(`[Extract API] ${activeModelName} Attempt 1 schema parse failed, trying Attempt 2...`);
          rawJsonText = await executeModelCall(systemInstruction2);
          const validated = parseAndValidate(rawJsonText);
          if (!hasCustomKey) {
            await serviceSupabase.rpc('increment_model_usage', { p_model_name: activeModelName });
          }
          return NextResponse.json({ data: validated, model_used: activeModelName });
        }
      } catch (modelErr: unknown) {
        const parsedErr = parseGeminiError(modelErr);
        lastError = parsedErr;

        if (hasCustomKey && (parsedErr.statusCode === 400 || parsedErr.statusCode === 401 || parsedErr.statusCode === 403)) {
          return NextResponse.json(
            { error: 'Your custom API key is invalid or expired. Please update it in your profile.' },
            { status: 401 }
          );
        }

        if (parsedErr.isQuotaError) {
          const blockSecs = parsedErr.retryAfterSeconds || 86400;
          if (!hasCustomKey) {
            await blockModelInDb(activeModelName, blockSecs);
          }
          excludedModels.push(activeModelName);
          console.warn(`[Extract API] Model ${activeModelName} hit quota. Trying fallback model...`);
          continue;
        } else if (parsedErr.isUnavailableError) {
          const blockSecs = parsedErr.retryAfterSeconds || 300;
          if (!hasCustomKey) {
            await blockModelInDb(activeModelName, blockSecs);
          }
          excludedModels.push(activeModelName);
          console.warn(`[Extract API] Model ${activeModelName} unavailable (503). Trying fallback model...`);
          continue;
        } else {
          console.error("[Extract API] Extraction error:", parsedErr.message);
          return NextResponse.json(
            {
              error: 'Failed to extract valid job data after 2 attempts.',
              details: parsedErr.message,
              partialData: null,
            },
            { status: 422 }
          );
        }
      }
    }

    if (lastError?.isUnavailableError) {
      return NextResponse.json({
        error: 'service_unavailable',
        message: 'The AI model is currently experiencing high demand. Please try again in a few moments.'
      }, { status: 503 });
    }

    return NextResponse.json({
      error: 'all_models_exhausted',
      retryAfterSeconds: 60
    }, { status: 429 });

  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'An unexpected server error occurred.', details: (error as Error).message, partialData: null },
      { status: 500 }
    );
  }
}
