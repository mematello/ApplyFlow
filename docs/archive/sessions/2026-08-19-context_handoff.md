# ApplyFlow — Context Handoff

## Session summary
Updated documentation to reflect the decision to permanently use Gmail SMTP for Supabase Auth emails, canceling plans for a custom domain and Resend SMTP integration for auth.

## Current state
Supabase Auth SMTP is permanently using Gmail SMTP to save costs. `/api/cron/reminders` continues to use Resend API. Monitoring will be needed for Gmail suspension risks as launch volume grows.

## Open decisions
[anything unresolved that the new chat needs to pick up]

## Next steps
[the immediate next actions, in order]

## Notes for next session
[anything easy to forget — gotchas, half-finished threads]

## Knowledge Base Sync Checklist
- [ ] `changelog.md` (re-upload if updated)
- [ ] `decisions.md` (re-upload if new decisions were logged)
- [ ] `architecture.md` (re-upload if structural changes were made)
- [ ] `AGENTS.md` (re-upload if rules were updated)
- [ ] [Any new files to upload]

## Starter Prompt for New Chat
```text
[Ready-to-paste prompt for the new chat setting the initial goal based on Next Steps]
```

