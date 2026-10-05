import { createFileRoute } from '@tanstack/react-router'
import { eq, sql } from 'drizzle-orm'
import { user, session } from '@/db/schema'
import { isRole } from '@/lib/access'
import { getWorkspaceUser } from '@/server/auth'
import { getDatabase } from '@/server/db'
import { authEnvironment } from '@/server/env'

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
export const Route = createFileRoute('/api/admin/users')({ server: { handlers: {
  GET: async ({ request }) => {
    const actor = await getWorkspaceUser(request.headers)
    if (!actor) return json({ error: 'Sign in to continue.' }, 401)
    if (actor.role !== 'admin') return json({ error: 'Admin access required.' }, 403)
    const users = await getDatabase().select({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt }).from(user).orderBy(user.createdAt).limit(500)
    return json({ users })
  },
  PATCH: async ({ request }) => {
    // Cookie authentication needs an explicit origin check on custom mutation routes.
    if (!authEnvironment().trustedOrigins.includes(request.headers.get('origin') || '')) return json({ error: 'Invalid request origin.' }, 403)
    const actor = await getWorkspaceUser(request.headers)
    if (!actor) return json({ error: 'Sign in to continue.' }, 401)
    if (actor.role !== 'admin') return json({ error: 'Admin access required.' }, 403)
    let data: unknown
    try { data = await request.json() } catch { return json({ error: 'Invalid request.' }, 400) }
    if (!data || typeof data !== 'object' || !('userId' in data) || typeof data.userId !== 'string' || !('role' in data) || !isRole(data.role)) return json({ error: 'Choose admin or scout.' }, 400)
    if (data.userId === actor.id && data.role !== 'admin') return json({ error: 'Ask another admin to change your role.' }, 409)
    const userId = data.userId, role = data.role
    const result = await getDatabase().transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('vitamin-c-role-management'))`)
      // Recheck the actor after taking the lock to prevent concurrent role changes bypassing authorization.
      const [currentActor] = await tx.select({ role: user.role }).from(user).where(eq(user.id, actor.id))
      if (currentActor?.role !== 'admin') return { error: 'Admin access required.', status: 403 }
      const [target] = await tx.select().from(user).where(eq(user.id, userId))
      if (!target) return { error: 'Account not found.', status: 404 }
      if (target.role === role) return { status: 200 }
      if (target.role === 'admin' && role === 'scout') {
        const admins = await tx.select({ id: user.id }).from(user).where(eq(user.role, 'admin')).limit(2)
        if (admins.length < 2) return { error: 'At least one admin must remain.', status: 409 }
      }
      await tx.update(user).set({ role }).where(eq(user.id, userId))
      await tx.delete(session).where(eq(session.userId, userId))
      return { status: 200 }
    })
    return json(result.error ? { error: result.error } : { success: true }, result.status)
  },
} } })
