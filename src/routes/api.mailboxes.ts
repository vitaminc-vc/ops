import { createFileRoute } from '@tanstack/react-router'
import { getWorkspaceUser } from '../server/auth'
import { authEnvironment } from '../server/env'
import { limitedJSON, privateJSON } from '../server/api-access'
import { activateMailbox, disconnectMailbox, mailboxOverview } from '../server/mailboxes'
export const Route = createFileRoute('/api/mailboxes')({ server: { handlers: {
  GET: async ({ request }) => {
    const user = await getWorkspaceUser(request.headers); if (!user) return privateJSON({ error: 'Sign in to continue.' }, 401)
    try { return privateJSON(await mailboxOverview(user)) } catch { return privateJSON({ error: 'Mailbox status is unavailable.' }, 503) }
  },
  POST: async ({ request }) => {
    if (!authEnvironment().trustedOrigins.includes(request.headers.get('origin') || '')) return privateJSON({ error: 'Invalid request origin.' }, 403)
    const user = await getWorkspaceUser(request.headers); if (!user) return privateJSON({ error: 'Sign in to continue.' }, 401)
    try {
      const body = await limitedJSON(request, 5000)
      if (body.action === 'activate') return privateJSON(await activateMailbox(user))
      if (body.action === 'disconnect' && typeof body.id === 'string') return privateJSON(await disconnectMailbox(user, body.id))
      return privateJSON({ error: 'Invalid action.' }, 400)
    } catch (error) { return privateJSON({ error: error instanceof Error ? error.message : 'Mailbox connection failed.' }, 400) }
  },
} } })
