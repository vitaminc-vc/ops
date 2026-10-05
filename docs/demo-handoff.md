# Vitamin-C demonstration readiness

Updated 5 October 2026. Rehearsal and sending the founder email are reserved for Luke. A fictional CedarLoop founder deck is supplied locally in `artifacts/demo/`; it has not been emailed or imported as demo data.

**Shared app:** https://vitamin-c-platform-production.up.railway.app

## Status and next actions

| Feature | Current evidence | Next action / owner |
| --- | --- | --- |
| Shared deployment | Running in Burton Algorithms → vitamin-c → vitamin-c-platform; persistent encrypted settings on `/data`; existing Better Auth sign-in tested over HTTPS. | Luke can use his existing account. |
| Company and deck storage | Private Supabase tables applied with RLS. Live synthetic deck created a company, stored the original file and slide notes, downloaded privately, indexed in Supermemory and was retrieved through the Brain. The fixture was removed. | Ready at the app ingestion endpoint. |
| Gmail automation | Replacement graph saved in Vitamin-C n8n with complete thread/file retrieval and the restricted app-service credential. The old unscreened workflow is unpublished. | **Vitamin-C n8n owner:** restore execution capacity for `vitaminc-vc.app.n8n.cloud`. Then publish the prepared draft and run its recovery check. The upgraded `luketestapp` instance is a different instance; Luke is a Member in Vitamin-C. |
| HR screening | Enforced before email/file content is stored or sent to Supermemory. All 43 live model cases passed; deployed synthetic HR PDF was excluded without stored text/files. Unreadable or uncertain content is held. | Keep enforcement on. Review unsupported/image-only files separately. |
| Staff Google sign-in + Gmail | Better Auth Google sign-in, verified `@vitaminc.vc` restriction, encrypted tokens and own-mailbox connection are implemented. Connected Sources is available to signed-in staff. | **Vitamin-C Google owner:** provide the OAuth web client / project and approve Gmail API scope. Configure the callback below, activate the connected-mailbox schedule, then verify a real staff grant. Not live yet. |
| Notion companies/decks | Company creation, matching and file upload code is deployed. The target ID was found in the Claude Scout instructions; no integration token is configured. | **Notion owner:** confirm the target database and share it with an integration having Read, Insert and Update content. Add its secret in Connected Sources. Until then, companies/files remain in Supabase and Notion shows awaiting setup. |
| Portfolio | Actual Airtable base `appiNFlTS3OLfTkxB` is live: 1 company, Satellites on Fire; 0 financial submissions. Missing values remain unreported. | **Vitamin-C:** populate quarterly reports and missing figures in the base if financial charts are expected in the demo. |
| Startup assessment | Actual Claude Temp Check rubric imported; assessment run/history page implemented and a live assessment returned all six rubric categories. Its QA run was removed. | Ready with indexed company evidence. |
| Deal Flow Scout | Actual Claude Dealflow Analyst Generator instructions imported; persistent run/history page and public research execution implemented. Complete Notion pipeline is a prerequisite for deduplication. | **Notion owner:** grant access first. Full Scout execution is not verified while Notion is unavailable; Luke will perform the rehearsal. Reports are stored as runs; no automatic investment decision or outreach. |
| LP Engine | Replaced examples with the actual 405-row Claude project pipeline snapshot; latest source change 11 June 2026. | **Vitamin-C:** provide fresh Attio data and the approved research spreadsheet destination for live LP research. The displayed list is a snapshot, not a live Attio connection. |
| Response model key | The existing setup record says the temporary OpenAI key expires 8 October 2026. | **Luke:** replace it before expiry. The expiry date is from the prior setup record, not a fresh provider readback. |

## Google setup

- OAuth application type: Web application. Use Vitamin-C's Google Cloud project and internal Workspace audience where available.
- Authorized origin: `https://vitamin-c-platform-production.up.railway.app`.
- Authorized callback: `https://vitamin-c-platform-production.up.railway.app/api/auth/callback/google`.
- Login scopes: OpenID, email, profile. Mailbox connection adds `https://www.googleapis.com/auth/gmail.readonly` with offline consent. New connections do not request email sending access.
- Set server-only `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Import `integrations/n8n/vitaminc-connected-mailboxes.json`, assign the approved ingestion credential, verify capacity, and publish it before setting `GMAIL_SYNC_ENABLED=true`.
- The prepared 30-minute schedule costs approximately 1,440 executions per 30-day month, across all registered mailboxes. It is not active yet.
- Existing password-account holders should sign in with their password first and link Google from Connected Sources; this avoids implicitly linking an unverified local email account.
- New staff start as scouts. Existing admin-only email and LP boundaries remain; an admin must assign any additional access deliberately.

## Notion destination

The Scout source references `24fc4749d20e803fb4abda88b3bc06f1`. Confirm this is the intended deal-flow database before enabling write access. The deployed service has that ID but no token, so it correctly reports setup required. Google Drive upload is not configured. Inaccessible deck URLs are not fetched; attached readable files are the supported path.

## Tests and boundaries

Passed: TypeScript, production build, integration/source unit checks, private database/ingestion tests, actual n8n Code-node fixture checks, 43/43 live screening cases, authenticated streaming, source/role/origin checks, deployed Better Auth login, Airtable/LP readback, HR PDF exclusion, and live PPTX/notes → company → private download → Supermemory indexing/retrieval → duplicate retry.

PDF, PPTX, DOCX, TXT, CSV and Markdown extraction is implemented. Office chart data and embedded XLSX text (including hidden sheets and comments) are included in extraction and screening. Oversized, unreadable, unsupported or image-only content is held for review; it is not silently admitted. Individual files are limited to 15 MiB and the request to 24 MB. URLs requiring access are left unprocessed. n8n delivery, actual Google consent, Notion upload, full Scout research and live Attio research are **not** claimed as verified.

The production PDF check caught missing Linux native dependencies. The Docker build now includes both the PDF worker and platform canvas binary; the repaired Railway deployment passed.

n8n execution payload storage is disabled for successes, failures, manual runs and progress. Minimal screening receipts remain in the private app database. This does not promise zero provider retention: screening uses the configured OpenAI provider with `store:false`.

## Operator commands

```sh
npm run typecheck
npm run build
node --import tsx scripts/check-integrations.ts
node --import tsx scripts/check-knowledge.ts
node --import tsx scripts/check-demo.ts
node --import tsx scripts/check-ingestion.ts
node scripts/check-screened-workflow.mjs
QA_BASE_URL=https://vitamin-c-platform-production.up.railway.app node --import tsx scripts/check-production.ts
```

The live positive test `scripts/check-deployed.ts` uses the disposable QA account prepared by `scripts/check-demo-live.ts` against a development server. It removes only its own synthetic company, ingestion, files and memory document. Remove the exact QA account after browser tests using `scripts/check-demo-live.ts --cleanup`. Never commit `.env.local`, `.private/`, workflow credential values, prompts, LP exports or local screenshots.
