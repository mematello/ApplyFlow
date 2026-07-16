import { z } from 'zod';

export const JobExtractionSchema = z.object({
  company_name: z.string().describe("The hiring company's name, usually the first proper noun in the posting, sometimes followed by a star rating or review count"),
  role: z.string().describe("The job title as posted, including any qualifiers like Jr./Sr. or seniority level"),
  tech_stack: z.array(z.string()).describe("All programming languages, frameworks, databases, and technical tools explicitly mentioned in requirements or responsibilities, as individual items — split combined mentions like 'C#, C/C++' into separate entries"),
  salary_range: z.string().nullable().default(null).describe("Compensation figures if stated anywhere in the posting, including ranges with currency symbols like ₱ or PHP"),
  location: z.string().nullable().default(null).describe("City/region and remote/hybrid status where the job is based. This often appears as a standalone line near the top (e.g. 'Makati City, Metro Manila') even without an explicit 'Location:' label, and may also be restated later in requirements as a willingness-to-work clause — check the entire posting, not just the header"),
  source: z.string().nullable().default(null).describe("Where this posting was found or published, if mentioned (e.g. job board name)"),
  recruiter_name: z.string().nullable().default(null).describe("Name of a specific recruiter or hiring contact person, if named"),
  contact_info: z.string().nullable().default(null).describe("Email address or LinkedIn URL for application or inquiries, if present"),
  notes: z.string().nullable().default(null).describe("Any other noteworthy details not captured by other fields — e.g. training programs, work schedule, unusual requirements"),
});

export type JobExtraction = z.infer<typeof JobExtractionSchema>;
