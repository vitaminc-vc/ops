# Vitamin-C integrations — 4 October 2026

## Available on the local app

- `/connectors` and `/settings` are admin-only in navigation, route guards and API handlers. All mutations check the request origin and current database role. API responses do not contain stored credentials.
- Portfolio and company pages read the approved Vitamin-C Airtable base directly, refresh while visible every minute, retain reporting periods and currencies, and export real figures to CSV. Missing values and invalid calculations remain unreported. A derived MOIC is unavailable when the investment-cost basis is invalid. One company is currently available: Satellites on Fire. No quarterly financial submissions are available.
- The source-backed fund thesis is imported from Airtable and used by the live Brain. Assessment guidance can be entered in Settings; it is a separate source from the thesis. Workspace edits are distinguished from the original Airtable source. Saving uses a revision check to prevent stale settings from overwriting a newer session.
- The Brain combines authorized thesis, Airtable company records, the existing Gmail pilot, and successfully synced selected Notion pages. Source scopes are chosen on the server. Scouts receive only the data types an admin explicitly shares. Email and LP access remain admin-only. Unavailable providers are reported as gaps instead of becoming mock answers.
- Email screening is a draft, with `mode: off` enforced on the server. The UI can screen an example using saved or draft exclusions. No screening result changes mail or ingestion. The existing n8n inbound pilot is unchanged.
- Screening combines exact sender/label/attachment rules, explicit personnel-thread exclusions, and Luna structured output. Negation, aggregate hiring plans and commercial contracts are treated separately from individual personnel material. Unknown attachments, missing content, oversized threads, provider failures, incomplete responses and invalid outputs are held for review. Explanations never echo private personnel details.

## Access still needed

- **Notion:** the connected MCP account requires reauthentication; the previous Vitamin-C workspace grant was guest-only. The app has a read-only integration form and explicit page/data-source selection. An owner must create/share the appropriate integration, or supply selected exports through a separately agreed path. No Notion documents have been imported. The reader was verified with scoped synthetic responses, pagination and denied access. A successful sync replaces the snapshot atomically; failed access blocks that source rather than serving its old snapshot. Sync is on demand; attachments are not ingested.
- **Claude:** the connected browser is signed into Quickers and does not offer the Vitamin-C workspace. No current Claude prompt/rubric has been imported or represented as verified. The approved instructions can be pasted into Assessment guidance after access is arranged. Earlier prompt reviews are historical context only.
- **Additional Gmail accounts:** use our own Google OAuth authorization and n8n ingestion. Supermemory receives normalized approved documents through `/v3/documents`; its native Gmail connector and Connections API are not used. Removed the unused native onboarding/callback and broad-key retrieval fallback. Additional mailbox onboarding is disabled until our Google OAuth client, encrypted refresh-token handling and n8n workflow routing are configured. The workflow remains published, but n8n currently rejects executions because its execution limit was reached. Existing indexed knowledge is still retrievable. See `gmail-ingestion-architecture.md`.

## Verification

- `node --import tsx scripts/check-screening-live.ts`: **43/43 synthetic cases passed**, including 20 sensitive cases; no sensitive case was included. Final run used Luna for 27 cases; the remaining cases were handled by policy rules or safe review. The dataset includes multilingual HR, mixed/quoted threads, late-body personnel information, injection attempts, commercial contracts, aggregate hiring budgets, sender lookalikes and unreadable attachments. Results: `artifacts/screening-qa.json`. This is a dataset result, not a production accuracy guarantee.
- `node --import tsx scripts/check-integrations.ts`: screening failure/privacy handling, enforcement lock, reporting period/currency/null mapping, Notion scope/pagination, encrypted writes/tamper detection.
- `node --import tsx scripts/check-integrations-live.ts`: authenticated admin/scout/origin checks, secret redaction, actual Airtable records, thesis import, and HR screening without enforcement. Uses only the exact disposable QA account.
- A real authenticated streamed answer used the Airtable thesis and Satellites on Fire record, cited both, and reported runway as unknown. The fictional EmberGrid email was excluded from that company query. The existing email live-stream regression also passed.
- Browser: connector chooser/Notion form, focused white fields, settings save, keyboard example selection, founder inclusion and HR exclusion were verified. Desktop screenshots are in `artifacts/`. The browser viewport override returned without changing the actual viewport, including in a fresh tab; narrow layouts are implemented but were not visually verified in this pass. The override was reset.
- TypeScript, production Vite build, email source checks and whitespace checks passed.

## Storage and operation

Integration settings, credentials and selected Notion snapshots use authenticated encryption in ignored `.private/integrations.enc`, with a separate 32-byte server key, serialized atomic writes and restrictive file/directory modes. The existing Better Auth tables and runtime access are unchanged. This local store persists across development restarts. Before deployment, move to a shared database or configure persistent single-instance storage; multiple app processes are not supported by the file writer.

All credentials stay server-side. The response-model key expires 8 October 2026. Screening and chat use Responses with `store:false`. No production deployment or live email-screening enforcement has occurred. The dev server runs at `http://127.0.0.1:3000/`.

## Shared-key cutover — 4 October 2026

- Reused the existing `Vitamin-C Brain email retrieval` scoped credential in n8n's saved `Supermemory · Vitamin-C email` Bearer credential. Both consumers use the same key, scope and expiration (30 September 2027). No broader or third credential was created.
- Direct verification replayed the unchanged fictional founder email using its original custom ID, received the same document ID, read indexing status `done`, searched it and retrieved the full body. Evidence: `artifacts/shared-memory-key-verification.json`; rerunnable check: `scripts/check-memory-key.ts --rewrite-existing`.
- n8n runtime verification is blocked: Execute step returned **Execution limit reached**. The last listed scheduled success is 1 October 2026. Available executions must be restored before calling live ingestion healthy. Connector status now describes indexed knowledge access, not n8n heartbeat.
- Luke confirmed revocation at action time. The obsolete `Vitamin-C n8n email ingestion` key was revoked, and the console shows exactly one active key: `Vitamin-C Brain email retrieval`, shared by n8n and the server.
- Removed Supermemory native Gmail onboarding, its callback route, broad credential fallback, and unused pending state type. Custom Google OAuth + n8n routing remain to be configured.

Current cutover checks also passed: TypeScript, production build, integration and email-source regressions, a client bundle scan (41 assets, no server secrets), admin API unauthenticated rejection (401), and removed callback (404). The Gmail setup dialog was verified at desktop and 520px width without horizontal overflow; the temporary viewport was reset.

After old-key revocation, direct indexed-document search and full-email retrieval passed again (`artifacts/shared-memory-key-after-revocation.json`). Supermemory readback shows one active scoped key. Billing investigation: the current n8n Cloud account dashboard belongs to `luketestapp`, a different instance from `vitaminc-vc.app.n8n.cloud`, so its trial status must not be attributed to Vitamin-C. The exact Vitamin-C allowance remains unverified; the Vitamin-C workflow itself returned Execution limit reached. A one-minute Schedule Trigger consumes up to 1,440 workflow runs/day, even when no message is returned. Change the ingestion trigger/cadence before restoring capacity so empty checks do not immediately exhaust another allowance.

## Gmail-trigger cutover — 4 October 2026

Published `Gmail trigger and daily recovery` on the existing workflow `nQZOH7AFAwTHkjkf`, version `3ae10adc-8232-4f00-ad55-725894d8cfa5`. Normal ingestion now wakes on Gmail Message Received; one daily scan at 06:00 in the existing instance timezone handles retries and moved mail. Both branches retain full email retrieval, stable IDs, excluded folders, admin-only container, index-before-label handling and the same credentials. Batches are capped at 50 messages; larger backlogs need further recovery runs. No pinned trigger data or duplicate nodes remain.

The published export and semantic fixture checks passed. Readback: `artifacts/gmail-trigger-checks.json`; UI: `artifacts/gmail-trigger-published.png`. Local portable template and generator are updated. Fetch Test Event remains blocked by Execution limit reached, so no new-email end-to-end run is claimed for this version. The one-minute Schedule Trigger has been removed from the published graph.
