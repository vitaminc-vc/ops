# Gmail ingestion architecture

Decision approved by Luke on 4 October 2026.

## One Supermemory credential

Use one container-scoped service key for n8n document writes and server retrieval. The current container is `vitaminc_email_admin`; it is admin-only. The key expires 30 September 2027. Keep it in n8n's credential store and ignored server environment, never in the workflow JSON, browser or source control.

Supermemory receives content through `/v3/documents` and handles indexing and retrieval. Do not use its native Gmail connector or Connections API. No separate Supermemory connection-management credential is needed. Gmail OAuth credentials are a different provider and still required.

## Additional mailboxes

The admin-only Connectors page will manage our ingestion connections. This onboarding is not enabled yet. Configure our Google OAuth web client and n8n routing before enabling it.

1. A currently authenticated admin starts Google authorization for a named mailbox. Request Gmail read access; add modify access only if using the existing indexed-label strategy. Do not request send/compose access for new ingestion-only connections.
2. Bind a short-lived, one-use OAuth state to the initiating admin, exact mailbox and server callback. Verify the granted account and scopes. Handle denial, mismatches, expired state and replay without creating a connected record.
3. Store refresh tokens encrypted on the server or in n8n credentials. Refresh access tokens on the server. Never return tokens to the browser. Support reconnection and disconnect, including stopping the corresponding workflow route.
4. Give each mailbox a stable internal connection ID. Route n8n reads through that mailbox's authorization. Deduplicate with a stable ID that includes the mailbox/connection and Gmail message ID; two mailboxes may contain the same thread.
5. Normalize full MIME content into clean text. Add mailbox, connection ID, original date, message/thread IDs, source URL, company/event associations and admin visibility as metadata. Never let an email or browser select an arbitrary memory container.
6. Apply screening before the Supermemory document POST once the policy is explicitly enabled. Excluded or review-held content must not enter memory. Current enforcement stays OFF until the policy is agreed with Vitamin-C.
7. Use the shared scoped key to ingest. Verify Supermemory indexing status `done` before recording success or setting an indexed marker. Preserve retries and idempotency.
8. Extend the server's approved-mailbox allowlist before enabling new connections. Retrieval must verify admin role, container, source type, mailbox and registered connection metadata. Company associations organize the knowledge; they do not require one API key per company.

The existing Luke mailbox uses its current n8n OAuth credential with Gmail Message Received and a daily recovery scan. Gmail polling happens inside the trigger; the full workflow no longer runs every minute while idle. It does not depend on the local app being online. Extra mailboxes must also use a reachable worker/ingestion path; a development localhost URL cannot be called by n8n Cloud.

## Gates before enabling onboarding

- Google Cloud project and web OAuth client, Gmail API enabled, exact callback URI, consent audience/test users as appropriate.
- Encrypted token storage, refresh and revoked-grant recovery; current local file storage supports only one persistent app instance.
- Per-mailbox n8n routing and an authenticated service interface if n8n calls the app. Give this interface ingestion-specific authority; a service token is not another Supermemory key.
- Verify authorization, ingestion, indexing and role-scoped retrieval independently. A successful OAuth redirect or queued POST alone is not proof of searchable knowledge.

References: [Google OAuth web-server flow](https://developers.google.com/identity/protocols/oauth2/web-server), [Gmail authorization scopes](https://developers.google.com/workspace/gmail/api/auth/scopes), [Supermemory scoped keys](https://supermemory.ai/docs/authentication).
