import { createFileRoute } from '@tanstack/react-router'
import { getPool } from '../server/db'
export const Route = createFileRoute('/api/health')({ server: { handlers: { GET: async () => {
  try {
    await getPool().query('select 1 from vitamin_auth."user" limit 1')
    return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } })
  } catch { return Response.json({ status: 'unavailable' }, { status: 503 }) }
} } } })
