import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { MatchAssessmentSchema } from '../../../lib/schemas/matching';
import { createClient } from '../../../lib/supabase/server';
import { getAvailableModel, AllModelsExhaustedError, parseGeminiError, blockModelInDb, AI_MODELS } from '../../../lib/ai/models';
import { createServiceClient } from '../../../lib/supabase/serviceClient';

let ai: GoogleGenAI;

const geminiMatchSchema = {
  type: Type.OBJECT,
  properties: {
    role_fit: { type: Type.INTEGER, nullable: true, description: "1 to 5 scale" },
    culture_fit: { type: Type.INTEGER, nullable: true, description: "1 to 5 scale" },
    priority: { type: Type.STRING, nullable: true, description: "enum: low, medium, or high" },
    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
    gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
    notes: { type: Type.STRING },
  },
  required: ['strengths', 'gaps', 'notes'],
};

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (!user || authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobDescription, resumeText } = await req.json();

    if (!jobDescription || typeof jobDescription !== 'string') {
      return NextResponse.json({ error: 'jobDescription is required' }, { status: 400 });
    }

    if (!resumeText || typeof resumeText !== 'string' || resumeText.trim().length === 0) {
      return NextResponse.json({
        data: { role_fit: null, culture_fit: null, priority: null, strengths: [], gaps: [], notes: "" }
      });
    }

    if (!ai) {
      if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ error: 'GEMINI_API_KEY is missing' }, { status: 500 });
      }
      ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }

    const systemInstruction = `You are an expert technical recruiter matching candidates to job descriptions.
Your task is to analyze the provided Job Description against the Candidate's Resume.
Assess the role fit and culture fit on a scale of 1 to 5.
Categorize the overall priority as 'low', 'medium', or 'high'.
Identify key strengths and gaps and list them as separate string arrays in the JSON.
For the notes field, write a single flowing paragraph in the FIRST PERSON (as if the candidate is reflecting on the role for their own tracker).
Reference Tone: "Fresh graduate-friendly role with strong alignment to my Computer Science background and internship experience. Requirements closely match my skills in Python, Java, Git/GitHub, databases, APIs, and software development fundamentals. Exposure to C#, ASP.NET Core, and enterprise application development would help broaden my technical stack."
The notes must be concise, 3-5 sentences, with no headers, no bullet formatting, and no third-person assessment.
CRITICAL CONSTRAINT: Never speculate about the candidate's personal circumstances not stated in their resume. Do not make assumptions about commute, location, availability, family situation, or anything not explicitly present in the provided resume text. Only reason from skills, experience, and qualifications actually stated.
Return valid JSON matching the schema strictly. Missing/unknown fit fields should be null.`;

    const prompt = `--- JOB DESCRIPTION ---
${jobDescription}

--- CANDIDATE RESUME ---
${resumeText}`;

    const serviceSupabase = createServiceClient();
    const excludedModels: string[] = [];
    let attempts = 0;
    const maxAttempts = AI_MODELS.length;
    let lastError: any = null;

    while (attempts < maxAttempts) {
      attempts++;
      let activeModelName: string;

      try {
        activeModelName = await getAvailableModel(user.id, excludedModels);
      } catch (e: any) {
        if (e instanceof AllModelsExhaustedError) {
          return NextResponse.json({
             error: 'all_models_exhausted',
             retryAfterSeconds: e.retryAfterSeconds
          }, { status: 429 });
        }
        throw e;
      }

      try {
        const response = await ai.models.generateContent({
          model: activeModelName,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: geminiMatchSchema,
            temperature: 0.1,
          }
        });
        
        await serviceSupabase.rpc('increment_model_usage', { p_model_name: activeModelName });
        
        const rawJsonText = response.text || "";
        if (!rawJsonText) throw new Error("No response text from AI model");
        const firstBrace = rawJsonText.indexOf('{');
        const lastBrace = rawJsonText.lastIndexOf('}');
        if (firstBrace === -1 || lastBrace === -1) throw new Error("No JSON found");
        
        const parsedData = JSON.parse(rawJsonText.slice(firstBrace, lastBrace + 1));
        const validated = MatchAssessmentSchema.parse(parsedData);

        return NextResponse.json({ data: validated, model_used: activeModelName });

      } catch (modelErr: any) {
        const parsedErr = parseGeminiError(modelErr);
        lastError = parsedErr;

        if (parsedErr.isQuotaError) {
          const blockSecs = parsedErr.retryAfterSeconds || 86400;
          await blockModelInDb(activeModelName, blockSecs);
          excludedModels.push(activeModelName);
          console.warn(`[Match API] Model ${activeModelName} hit quota. Blocked for ${blockSecs}s. Trying fallback model...`);
          continue;
        } else if (parsedErr.isUnavailableError) {
          const blockSecs = parsedErr.retryAfterSeconds || 300;
          await blockModelInDb(activeModelName, blockSecs);
          excludedModels.push(activeModelName);
          console.warn(`[Match API] Model ${activeModelName} unavailable (503/high demand). Blocked for ${blockSecs}s. Trying fallback model...`);
          continue;
        } else {
          console.error("[Match API] Error:", parsedErr.message);
          return NextResponse.json({ error: 'Failed to analyze match.', details: parsedErr.message }, { status: 500 });
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

  } catch (error: any) {
    console.error("[Match API] Unexpected error:", error.message);
    return NextResponse.json(
      { error: 'Failed to analyze match.', details: error.message },
      { status: 500 }
    );
  }
}
