import { config } from 'dotenv'
import { eq, sql } from 'drizzle-orm'
import { user, session } from '../src/db/schema'
import { createDatabase } from '../src/server/db'
config({ path: '.env.local', quiet: true })
const emailFlag = process.argv.indexOf('--email')
const email = (emailFlag < 0 ? process.env.BOOTSTRAP_ADMIN_EMAIL || '' : process.argv[emailFlag + 1] || '').trim().toLowerCase()
if (!email || !email.includes('@')) throw new Error('Set BOOTSTRAP_ADMIN_EMAIL or use npm run auth:admin -- --email your-email@example.com. Create the account in the app first.')
const { db, pool } = createDatabase(true)
try {
  await db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('vitamin-c-role-management'))`)
    const [account] = await tx.select().from(user).where(eq(user.email, email))
    if (!account) throw new Error('Create this account in the app before promoting it.')
    const admins = await tx.select({ id: user.id }).from(user).where(eq(user.role, 'admin')).limit(1)
    if (admins.length && account.role !== 'admin') throw new Error('An admin already exists. Use Team access to manage additional admins.')
    if (account.role !== 'admin') {
      await tx.update(user).set({ role: 'admin' }).where(eq(user.id, account.id))
      await tx.delete(session).where(eq(session.userId, account.id))
    }
  })
  console.log('The selected account has admin access. Sign in again to open all workspaces.')
} catch (error) {
  console.error(error instanceof Error && ['Create this account in the app before promoting it.', 'An admin already exists. Use Team access to manage additional admins.'].includes(error.message) ? error.message : 'Admin setup failed. Check the database configuration.')
  process.exitCode = 1
} finally { await pool.end() }
