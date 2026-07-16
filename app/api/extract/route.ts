import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { JobExtractionSchema } from '../../../lib/schemas/extraction';
import { createClient } from '../../../lib/supabase/server';

// Initialize the Google Gen AI client inside the POST handler
// to prevent module-level crashes if the environment variable is missing
let ai: GoogleGenAI;

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
    salary_range: { type: Type.STRING, nullable: true, description: "Compensation figures if stated anywhere in the posting, including ranges with currency symbols like ₱ or PHP" },
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

    if (!ai) {
      if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ error: 'GEMINI_API_KEY is not set. Please check your .env.local file and restart the dev server.', partialData: null }, { status: 500 });
      }
      ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }

    const body = await req.json();
    const { jobDescription } = body;

    if (!jobDescription || typeof jobDescription !== 'string') {
      return NextResponse.json(
        { error: 'jobDescription is required and must be a string.', partialData: null },
        { status: 400 }
      );
    }

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
  "salary_range": "₱60,000-₱90,000",
  "location": "BGC, Taguig",
  "source": null,
  "recruiter_name": null,
  "contact_info": null,
  "notes": "Hybrid (3 days a week in office)"
}`;

    const systemInstruction1 = 'You are an expert ATS data extraction AI. Extract the job details from the provided job description. Ensure the output strictly follows the requested JSON schema. If information is missing, leave the nullable fields as null.' + oneShotExample;
    const systemInstruction2 = 'You are an expert ATS data extraction AI. Extract the following exact fields: company_name (string), role (string), tech_stack (array of strings), salary_range (string or null), location (string or null), source (string or null), recruiter_name (string or null), contact_info (string or null), notes (string or null). You MUST return valid JSON matching this structure exactly. Missing fields MUST be null, not omitted.' + oneShotExample;

    const performExtraction = async (systemInstruction: string) => {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: jobDescription,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: geminiSchema,
          temperature: 0.1,
        }
      });
      return response.text;
    };

    let rawJsonText: string = "";
    let parsedData: any = null;

    // Try 1
    try {
      rawJsonText = await performExtraction(systemInstruction1);
      const cleanedText = rawJsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      parsedData = JSON.parse(cleanedText);
      const validated = JobExtractionSchema.parse(parsedData);
      return NextResponse.json({ data: validated });
    } catch (error1: any) {
      // Try 2
      try {
        rawJsonText = await performExtraction(systemInstruction2);
        const cleanedText = rawJsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        parsedData = JSON.parse(cleanedText);
        const validated = JobExtractionSchema.parse(parsedData);
        return NextResponse.json({ data: validated });
      } catch (error2: any) {
        // Return 422 on second failure
        return NextResponse.json(
          {
            error: 'Failed to extract valid job data after 2 attempts.',
            details: error2.message,
            partialData: parsedData || null,
          },
          { status: 422 }
        );
      }
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: 'An unexpected server error occurred.', details: error.message, partialData: null },
      { status: 500 }
    );
  }
}
