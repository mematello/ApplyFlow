export interface Profile {
  id: string;
  full_name: string | null;
  preferred_model: string | null;
  preferred_provider: string | null;
}

export interface Application {
  id: string;
  user_id: string;
  company_name: string;
  role: string;
  tech_stack: string[];
  salary_range: string | null;
  currency: string | null;
  location: string | null;
  source: string | null;
  recruiter_name: string | null;
  contact_info: string | null;
  notes: string | null;
  date_applied: string | null;
  status: string;
  job_link: string | null;
  priority: string | null;
  resume_version: string | null;
  cover_letter_sent: boolean;
  role_fit: number | null;
  culture_fit: number | null;
  rejection_reason: string | null;
  next_action: string | null;
  next_action_date: string | null;
  reminder_enabled: boolean;
  interview_stage: string | null;
  interview_notes: string | null;
  next_action_reminder_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface Resume {
  id: string;
  user_id: string;
  version_label: string;
  storage_path: string;
  extracted_text: string | null;
  is_current: boolean;
  created_at: string;
}

export interface AIModel {
  name: string;
  description: string;
  dailyLimit: number;
  request_count: number;
  blocked_until: string | null;
  is_preferred?: boolean;
}

export interface ApiKey {
  provider: string;
  created_at: string;
}
