-- 1. Create the resumes table
CREATE TABLE IF NOT EXISTS public.resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    version_label TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    extracted_text TEXT,
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

-- 3. Table policies
CREATE POLICY "Users can view their own resumes" ON public.resumes
    FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own resumes" ON public.resumes
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own resumes" ON public.resumes
    FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own resumes" ON public.resumes
    FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 4. Set up Supabase Storage Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

-- 5. Set up strictly scoped Storage Policies
-- SELECT
CREATE POLICY "Users can read their own resume files" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

-- INSERT
CREATE POLICY "Users can upload their own resume files" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

-- UPDATE
CREATE POLICY "Users can update their own resume files" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

-- DELETE
CREATE POLICY "Users can delete their own resume files" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);
