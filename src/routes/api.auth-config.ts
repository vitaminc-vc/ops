import { createFileRoute } from '@tanstack/react-router'
export const Route = createFileRoute('/api/auth-config')({ server: { handlers: { GET: () => Response.json({
  google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  passwordSignup: true,
}, { headers: { 'Cache-Control': 'no-store' } }) } } })
