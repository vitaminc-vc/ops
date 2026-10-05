# Demo preparation — 1 October 2026

## Live behavior

- Admin chat retrieves the existing Vitamin-C Gmail knowledge container and generates a live Luna answer through OpenAI Responses. Actual `response.output_text.delta` events are forwarded immediately over the app's SSE endpoint; there is no word timer or canned-answer fallback.
- Conversation context supports follow-up questions. Retrieval remains fixed to the authenticated admin's approved email pilot scope; source content cannot select a container or invoke writes.
- UI source cards separate email sender/address/date/subject/body and attachment metadata. Cards read the full original indexed email, including the final paragraph, with no line clamp or source footer. Older cached cards hydrate through an authenticated admin-only endpoint; document scope is checked before content is returned. Source text renders as plain text, remote email images are not loaded, and model Markdown cannot embed images or arbitrary links. Inline citations open the matching source card.
- Presentation removes the ingestion-test subject prefix. Original stored documents and Gmail messages are unchanged. The EmberGrid figures remain sample data; model instructions preserve that fact without introducing ingestion/debug language.
- Conversation scrolling uses `@shadcn/react/message-scroller` directly: new user-turn anchors, last-anchor restore, follow-output while at the live edge, and a return-to-latest control. Streamdown renders incremental Markdown.
- Provider brand images are hosted locally, with Gmail using Luke's supplied PNG. Email body wording is retained, including the sample email's original disclosure; cleanup only normalizes HTML, transport wrapping, headers and link/image artifacts. Attachment names/sizes render only when supplied by real source metadata; the current Gmail pilot does not ingest attachment contents.

## Configuration and verification

- Dedicated OpenAI key has restricted Responses permissions and expires 8 October 2026. Stored only in ignored mode-600 `.env.local`; `CHAT_MODEL=gpt-6-luna`. Requests set `store:false`; this is not a promise of zero provider retention.
- `node --import tsx scripts/check-demo.ts`: source presentation, safe attachment metadata, source isolation/relevance, incremental SSE parsing, failed/incomplete/rate-limited response handling.
- `node --import tsx scripts/check-knowledge.ts`: existing source and role isolation checks.
- `node --import tsx scripts/check-demo-live.ts`: local disposable-account checks for signed-out/scout/origin/history rejection and a real authenticated cited model stream. Browser QA uses the exact generated disposable account; remove it with `--cleanup` after inspection.
- TypeScript and Vite builds must pass before handoff.

Verified on 1 October: TypeScript, Vite production build, source presentation and SSE checks passed. Authenticated full-email retrieval returned all 1,464 original characters, with a stable saved source ID and the final signature. Browser checks passed for cached-card hydration, contextual follow-up, stop/retry, no email line clamp or footer, the supplied Gmail PNG, and a 390px viewport without horizontal overflow. The exact disposable QA account was removed after inspection; the localhost dev server remains running.

The dashboard and LP records retain their existing mock-data boundary. Connector/settings work is paused in `integration-checkpoint.md`. No live email-screening enforcement or Notion import was enabled for this demo.
