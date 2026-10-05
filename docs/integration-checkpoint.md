# Connector work checkpoint — 1 October 2026

Resumed at Luke's request after the demo. Current implementation and verification are in `integration-handoff.md`; the original checkpoint below records the earlier state.

## Completed

- Approved, created, and verified a read-only Airtable credential limited to `appiNFlTS3OLfTkxB` with record/schema read permissions. Stored only in ignored `.env.local`.
- Verified fund thesis from its source record and the company table. One company record is present; no quarterly financial submissions are present. The source contains an infinite cost calculation, which must remain unreported rather than become a made-up number.
- Added unused server foundations: encrypted local integration state, shared integration types, Airtable API adapter with explicit field selection and period/currency handling, selective Notion reader, and conservative Luna screening adapter. No new settings/connector routes or UI have been wired yet. No Notion ingestion has run.
- Generated a separate connector encryption key in ignored environment. Local private schema inspection and any encrypted state belong in ignored `.private/`.

## Boundaries and pending work

- User selected: build and test screening; leave live enforcement OFF. Existing n8n pilot remains unchanged.
- Notion MCP refuses the client's guest role. Needs member access or an owner-created read-only integration shared with the relevant pages/databases. Do not bypass permissions.
- Chrome Claude is signed into Quickers; the Vitamin-C project URL returns no permission. Comet inspection stalled on a screen-capture failure. The previous scoped review is in `/Users/luke/.codex/worktrees/f6b9/ops/docs/vitaminc-build-scope.md`; don't treat that review as current prompt validation.
- Connectors page should be admin-only, show genuine connection/sync status, support additional mailbox connections and source selection, and never return stored credentials to clients.
- Superseded 4 October: Gmail onboarding will use our own Google OAuth and n8n routing. Do not use Supermemory Connections or its native Gmail connector. One shared scoped key supports document ingestion and retrieval.
- Remaining: settings/connector routes/UI, live Airtable dashboard wiring, Notion activation, thesis/rubric validation, mailbox onboarding, detailed screening fixtures/live model QA, authorization/recovery/responsive checks.
- Integration storage foundation currently uses encrypted local files for this local app; a durable shared store is needed before running multiple production instances.
