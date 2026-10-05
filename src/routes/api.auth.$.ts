import { createFileRoute } from '@tanstack/react-router'
import { getAuth } from '../server/auth'

async function handle({ request }: { request: Request }) {
  try { return await getAuth().handler(request) }
  catch { return Response.json({ message: 'Sign-in is temporarily unavailable. Please try again shortly.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }) }
}
export const Route = createFileRoute('/api/auth/$')({ server: { handlers: { GET: handle, POST: handle } } })
