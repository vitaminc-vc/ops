import { createFileRoute } from '@tanstack/react-router'
import { getWorkspaceUser } from '@/server/auth'
import { retrieveFullEmail } from '@/server/knowledge'

export const Route = createFileRoute('/api/knowledge/email')({ server: { handlers: { GET: async ({ request }) => {
  const user = await getWorkspaceUser(request.headers)
  if (!user) return Response.json({ error: 'Sign in to read this email.' }, { status: 401 })
  if (user.role !== 'admin') return Response.json({ error: 'Email knowledge requires admin access.' }, { status: 403 })
  const id = new URL(request.url).searchParams.get('id') || ''
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) return Response.json({ error: 'Email unavailable.' }, { status: 400 })
  try {
    return Response.json(await retrieveFullEmail(id, user.role, request.signal), { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json({ error: 'The full email could not be loaded. Please try again.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
  }
} } } })
