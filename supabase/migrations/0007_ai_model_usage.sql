-- Create table for tracking AI model usage
CREATE TABLE ai_model_usage (
  model_name TEXT NOT NULL,
  date DATE NOT NULL,
  request_count INT NOT NULL DEFAULT 0,
  blocked_until TIMESTAMPTZ,
  PRIMARY KEY (model_name, date)
);

-- Enable RLS for ai_model_usage
ALTER TABLE ai_model_usage ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access for all authenticated users"
  ON ai_model_usage FOR SELECT
  TO authenticated
  USING (true);

-- Add preferred_model to profiles
ALTER TABLE profiles ADD COLUMN preferred_model TEXT;

-- Create RPC to safely increment usage without race conditions
CREATE OR REPLACE FUNCTION increment_model_usage(p_model_name TEXT)
RETURNS void AS $$
BEGIN
  INSERT INTO ai_model_usage (model_name, date, request_count)
  VALUES (p_model_name, CURRENT_DATE, 1)
  ON CONFLICT (model_name, date)
  DO UPDATE SET request_count = ai_model_usage.request_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RPC to safely block a model
CREATE OR REPLACE FUNCTION block_model(p_model_name TEXT, p_blocked_until TIMESTAMPTZ)
RETURNS void AS $$
BEGIN
  INSERT INTO ai_model_usage (model_name, date, request_count, blocked_until)
  VALUES (p_model_name, CURRENT_DATE, 0, p_blocked_until)
  ON CONFLICT (model_name, date)
  DO UPDATE SET blocked_until = p_blocked_until;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
