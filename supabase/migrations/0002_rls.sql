-- Enable Row Level Security on the applications table
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Create policy for full CRUD access based on auth.uid() matching user_id
CREATE POLICY "Users can manage their own applications"
ON applications
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
