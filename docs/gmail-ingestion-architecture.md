# Gmail ingestion architecture

Current implementation, 5 October 2026. See [demo readiness and owner actions](demo-handoff.md) for live status.

## Existing mailbox

Vitamin-C n8n reads `luke@vitaminc.vc` using its existing Gmail OAuth credential. A Gmail Message Received trigger wakes the workflow; one daily recovery schedule handles missed/failed work. Empty internal trigger polls do not start the full workflow. Both paths fetch up to 50 unprocessed messages, load every member of their threads, and download attachments.

The replacement workflow calls the deployed app's `/api/ingest/email` with the separate, host-restricted `Vitamin-C screened ingestion` Bearer credential. This credential cannot call admin APIs. The app parses all supported files, screens the entire email/thread/files, then writes approved content and companies to private Supabase tables and the fixed admin-only `vitaminc_email_admin` Supermemory container. Original file bytes remain private and downloadable only by admins. Optional Notion sync creates a company page and attaches files after screening.

Excluded or review-held emails retain only minimal status metadata, with no subject, body, sender, filenames or bytes. Result labels distinguish indexed, excluded and review. An indexed label is applied only after Supermemory reports `done`. Missing files or model failures hold content. Saved n8n execution payloads are disabled.

## Staff onboarding

Better Auth handles Google authorization and state. Google sign-in requires a verified `@vitaminc.vc` address and creates a scout account. Connected Sources is visible to staff; they can link only their own Google account and request Gmail read-only scope. The server verifies the granted Gmail profile equals the signed-in identity before registering a mailbox. Tokens are encrypted in Better Auth storage and never returned through browser token endpoints.

The inactive connected-mailbox n8n template calls `/api/ingest/sync` every 30 minutes. The server refreshes grants, checks account ownership, reads complete threads and files, and uses the same screened ingestion code. IDs include mailbox identity. A disconnected mailbox stops at the next per-message check. A global lock prevents overlapping syncs; a watermark advances only after the complete batch is handled.

Both Google client credentials and `GMAIL_SYNC_ENABLED=true` are required. Keep that flag false until the schedule is active and Google setup is tested. No new Supermemory credential or native Supermemory Gmail connector is needed.

## Storage and access

`vitamin_data` contains companies, ingestion receipts, documents, registered mailboxes and agent runs. RLS and schema grants restrict access to the app role; anonymous/authenticated Data API roles have no access. Admin-only routes guard companies, documents, email knowledge, LP context and runs. Registered mailbox metadata extends the server's fixed retrieval allowlist. Browser/model input cannot select arbitrary containers.

The app runs as one Railway instance with a persistent volume for encrypted integration configuration. Better Auth sessions/tokens and workspace records are in Supabase. Use a privileged connection only for reviewed migrations, never for runtime.

## Remaining gates

- Vitamin-C n8n execution capacity and publication/runtime verification of the saved replacement draft.
- Google web client, Gmail API, consent audience and a real staff authorization test.
- Notion integration Read/Insert/Update access to the confirmed deal database.
- Real inbound email delivery and the user-run founder-deck rehearsal.

Provider references: [Google web OAuth](https://developers.google.com/identity/protocols/oauth2/web-server), [Gmail scopes](https://developers.google.com/workspace/gmail/api/auth/scopes), [n8n Gmail operations](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.gmail/message-operations/).
