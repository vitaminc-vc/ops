import { createFileRoute } from '@tanstack/react-router'
import { limitedJSON, privateJSON } from '../server/api-access'
import { requireIngestionService } from '../server/service-access'
import { ingestEmail, refreshIngestion, validateInbound } from '../server/ingestion'
export const Route = createFileRoute('/api/ingest/email')({ server: { handlers: {
  POST: async ({ request }) => {
    if (!requireIngestionService(request)) return privateJSON({ error: 'Unauthorized.' }, 401)
    try { return privateJSON(await ingestEmail(validateInbound(await limitedJSON(request, 24_000_000)))) }
    catch { return privateJSON({ error: 'Email processing did not complete. Retry after checking the ingestion log.' }, 422) }
  },
  GET: async ({ request }) => {
    if (!requireIngestionService(request)) return privateJSON({ error: 'Unauthorized.' }, 401)
    const id = new URL(request.url).searchParams.get('id') || ''
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) return privateJSON({ error: 'Invalid receipt.' }, 400)
    try { return privateJSON(await refreshIngestion(id)) } catch { return privateJSON({ error: 'Receipt unavailable.' }, 503) }
  },
} } })
