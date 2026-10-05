import { randomUUID } from 'node:crypto'
import { getAuth } from './auth'
import { getPool } from './db'
import type { WorkspaceUser } from '../lib/access'

export const gmailReadScope = 'https://www.googleapis.com/auth/gmail.readonly'
export async function mailboxOverview(user: WorkspaceUser) {
  const [mailboxes, accounts] = await Promise.all([
    getPool().query('select id,email,status,last_sync,last_error from vitamin_data.mailboxes where user_id=$1', [user.id]),
    getPool().query("select scope from vitamin_auth.account where user_id=$1 and provider_id='google'", [user.id]),
  ])
  return { connections: mailboxes.rows, oauth: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    grantReady: accounts.rows.some(a => String(a.scope || '').split(/[ ,]/).includes(gmailReadScope)),
    ingestionReady: process.env.GMAIL_SYNC_ENABLED === 'true' }
}
export async function activateMailbox(user: WorkspaceUser) {
  if (process.env.GMAIL_SYNC_ENABLED !== 'true') throw Error('Mailbox sync is awaiting setup.')
  const accounts = await getPool().query("select id,scope,refresh_token from vitamin_auth.account where user_id=$1 and provider_id='google'", [user.id])
  const account = accounts.rows.find(a => String(a.scope || '').split(/[ ,]/).includes(gmailReadScope) && a.refresh_token)
  if (!account) throw Error('Connect Google and approve Gmail access first.')
  const token = await getAuth().api.getAccessToken({ body: { accountId: account.id, userId: user.id } })
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', { headers: { Authorization: `Bearer ${token.accessToken}` }, signal: AbortSignal.timeout(15_000), redirect: 'error' })
  if (!response.ok) throw Error('Google access needs to be reconnected.')
  const profile = await response.json() as { emailAddress?: string }
  if (profile.emailAddress?.toLowerCase() !== user.email.toLowerCase() || !user.email.toLowerCase().endsWith('@vitaminc.vc')) throw Error('Connect your own Vitamin-C mailbox.')
  await getPool().query(`INSERT INTO vitamin_data.mailboxes(id,user_id,account_id,email) VALUES ($1,$2,$3,$4)
    ON CONFLICT(email) DO UPDATE SET status='connected',last_error=NULL,account_id=EXCLUDED.account_id WHERE mailboxes.user_id=EXCLUDED.user_id`, [randomUUID(), user.id, account.id, user.email.toLowerCase()])
  return mailboxOverview(user)
}
export async function disconnectMailbox(user: WorkspaceUser, id: string) {
  await getPool().query("update vitamin_data.mailboxes set status='disconnected' where id=$1 and user_id=$2", [id, user.id])
  return mailboxOverview(user)
}
