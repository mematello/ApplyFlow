CREATE TYPE application_status AS ENUM ('draft', 'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn');
CREATE TYPE application_priority AS ENUM ('low', 'medium', 'high');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  role TEXT NOT NULL,
  tech_stack TEXT[],
  date_applied DATE,
  status application_status NOT NULL DEFAULT 'draft',
  job_link TEXT,
  location TEXT,
  salary_range TEXT,
  source TEXT,
  recruiter_name TEXT,
  contact_info TEXT,
  next_action TEXT,
  next_action_date DATE,
  priority application_priority,
  resume_version TEXT,
  cover_letter_sent BOOLEAN DEFAULT FALSE,
  role_fit SMALLINT,
  culture_fit SMALLINT,
  rejection_reason TEXT,
  notes TEXT,
  raw_jd TEXT,
  extraction_confidence JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_applications_updated_at
BEFORE UPDATE ON applications
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE interview_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,
  stage_date TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_next_action_date ON applications(next_action_date);
