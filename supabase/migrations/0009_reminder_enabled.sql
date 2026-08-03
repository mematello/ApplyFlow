-- Add column to track whether a reminder is enabled for the application
ALTER TABLE applications
ADD COLUMN reminder_enabled BOOLEAN DEFAULT false;

-- Backfill existing records: if they have a next_action_date, default to true
-- so we don't break expected behavior for users already relying on the current auto-send logic.
UPDATE applications
SET reminder_enabled = true
WHERE next_action_date IS NOT NULL AND next_action_reminder_sent = false;
