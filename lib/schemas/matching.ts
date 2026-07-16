import { z } from 'zod';

export const MatchAssessmentSchema = z.object({
  role_fit: z.number().min(1).max(5).nullable().describe("A score from 1 to 5 indicating how well the candidate's experience matches the technical and core role requirements. Null if undetermined."),
  culture_fit: z.number().min(1).max(5).nullable().describe("A score from 1 to 5 indicating how well the candidate matches the work environment, schedule (remote/hybrid), and soft skills. Null if undetermined."),
  priority: z.enum(['low', 'medium', 'high']).nullable().describe("Overall recommended priority to apply to this job based on fit."),
  strengths: z.array(z.string()).describe("List of 2-4 key bullet points where the candidate's resume perfectly matches the job description."),
  gaps: z.array(z.string()).describe("List of 1-3 bullet points indicating missing skills or experiences requested in the job description that are absent from the resume."),
  notes: z.string().describe("A concise summary of why this score was given, highlighting the most critical matching factors."),
});

export type MatchAssessment = z.infer<typeof MatchAssessmentSchema>;
