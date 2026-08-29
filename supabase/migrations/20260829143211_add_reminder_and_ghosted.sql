-- ==========================================
-- RUN THESE TWO BLOCKS SEPARATELY IN SUPABASE
-- (Do not run them together in one execution)
-- ==========================================

-- BLOCK 1: Workstream 1 - Timezone-aware reminders
-- Run this first:
ALTER TABLE profiles 
ADD COLUMN reminder_timezone TEXT,
ADD COLUMN reminder_send_time TIME DEFAULT '09:00:00';

-- BLOCK 2: Workstream 4 - Add 'ghosted' status
-- Run this second (Postgres requires ALTER TYPE ADD VALUE to run outside transaction blocks):
ALTER TYPE application_status ADD VALUE 'ghosted';
