import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { config } from 'dotenv'
import { eq, inArray } from 'drizzle-orm'
import { createDatabase } from '../src/server/db'
import { user, account } from '../src/db/schema'

config({ path: '.env.local', quiet: true })
const base = process.argv[2] || 'http://127.0.0.1:3000'
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('Run auth checks against a local app only.')
const { db, pool } = createDatabase(true)
const marker = randomUUID()
const password = `Test-only-${randomUUID()}!`
const createdIds: string[] = []
const call = (path: string, cookie = '', body?: unknown, method = body ? 'POST' : 'GET', origin = base) => fetch(`${base}${path}`, { method, redirect: 'manual', headers: { ...(cookie ? { cookie } : {}), ...(body ? { 'Content-Type': 'application/json', origin } : {}) }, body: body ? JSON.stringify(body) : undefined })
const cookieFrom = (response: Response) => response.headers.getSetCookie().map(cookie => cookie.split(';')[0]).join('; ')
async function signup(label: string, extra: Record<string, unknown> = {}) {
  const email = `vitamin-c-qa-${marker}-${label}@vitaminc.vc`
  let response = await call('/api/auth/sign-up/email', '', { name: `QA ${label}`, email, password, ...extra })
  if (response.status === 429) {
    // Exercise the real signup limiter without disabling it for tests.
    await new Promise(resolve => setTimeout(resolve, 11_000))
    response = await call('/api/auth/sign-up/email', '', { name: `QA ${label}`, email, password, ...extra })
  }
  assert.equal(response.status, 200, 'A valid account should be created')
  const result = await response.json()
  createdIds.push(result.user.id)
  assert.equal(result.user.role, 'scout', 'Every signup must receive scout access')
  const [stored] = await db.select().from(user).where(eq(user.id, result.user.id))
  assert.equal(stored.role, 'scout')
  const [credential] = await db.select().from(account).where(eq(account.userId, result.user.id))
  assert.equal(credential.providerId, 'credential')
  assert.notEqual(credential.password, password, 'Passwords must be hashed')
  const setCookie = response.headers.getSetCookie().join(';')
  assert.match(setCookie, /HttpOnly/i)
  assert.match(setCookie, /SameSite=Lax/i)
  return { id: result.user.id, email, cookie: cookieFrom(response) }
}
try {
  assert.equal((await call('/api/chat', '', { prompt: 'Hello' })).status, 401)
  assert.equal((await call('/api/admin/users')).status, 401)
  assert.equal((await call('/api/admin/users', 'tsr-csrf-token=unrelated-framework-cookie')).status, 401)
  assert.equal((await call('/portfolio')).status, 307)
  const scout = await signup('scout')
  const attempt = await call('/api/auth/sign-up/email', '', { name: 'QA forged admin', email: `vitamin-c-qa-${marker}-forged@vitaminc.vc`, password, role: 'admin' })
  if (attempt.ok) {
    const data = await attempt.json(); createdIds.push(data.user.id)
    assert.equal(data.user.role, 'scout', 'A forged signup role must not elevate privileges')
  } else assert.equal(attempt.status, 400)
  const shortPassword = await call('/api/auth/sign-up/email', '', { name: 'Short', email: `vitamin-c-qa-${marker}-short@vitaminc.vc`, password: 'short' })
  assert.equal(shortPassword.status, 400)
  const wrongLogin = await call('/api/auth/sign-in/email', '', { email: scout.email, password: 'Wrong-password-1234' })
  assert.equal(wrongLogin.status, 401)
  const session = await call('/api/auth/get-session', scout.cookie)
  assert.equal((await session.json()).user.role, 'scout')
  assert.equal((await call('/api/admin/users', scout.cookie)).status, 403)
  assert.equal((await call('/api/admin/users', scout.cookie, { userId: scout.id, role: 'admin' }, 'PATCH')).status, 403)
  const update = await call('/api/auth/update-user', scout.cookie, { role: 'admin' })
  assert.ok(update.status < 500)
  assert.equal((await (await call('/api/auth/get-session', scout.cookie)).json()).user.role, 'scout')
  assert.equal((await call('/api/chat', scout.cookie, { prompt: 'Find LP prospects', scope: 'All knowledge' })).status, 403)
  assert.equal((await call('/api/chat', scout.cookie, { prompt: 'What changed?', scope: 'LP relationships' })).status, 403)
  assert.equal((await call('/api/chat', scout.cookie, { prompt: 'Hello' }, 'POST', 'https://untrusted.example')).status, 403)
  assert.equal((await call('/api/chat', scout.cookie, {})).status, 400)
  assert.equal((await call('/api/chat', scout.cookie, { prompt: 'Hello', scope: 'Not a scope' })).status, 400)
  const lpPage = await call('/lp', scout.cookie)
  assert.ok(lpPage.status === 307 || lpPage.status === 302)
  assert.equal(new URL(lpPage.headers.get('location') || '/', base).pathname, '/')

  const admin = await signup('admin')
  await db.update(user).set({ role: 'admin' }).where(eq(user.id, admin.id))
  assert.equal((await call('/api/admin/users', admin.cookie)).status, 200, 'Role changes must be reflected without a stale session cache')
  assert.equal((await call('/lp', admin.cookie)).status, 200)
  assert.equal((await call('/api/admin/users', admin.cookie, { userId: scout.id, role: 'invalid' }, 'PATCH')).status, 400)
  assert.equal((await call('/api/admin/users', admin.cookie, { userId: admin.id, role: 'scout' }, 'PATCH')).status, 409)
  assert.equal((await call('/api/admin/users', admin.cookie, { userId: scout.id, role: 'admin' }, 'PATCH', 'https://untrusted.example')).status, 403)
  const promotion = await call('/api/admin/users', admin.cookie, { userId: scout.id, role: 'admin' }, 'PATCH')
  assert.equal(promotion.status, 200)
  assert.equal(await (await call('/api/auth/get-session', scout.cookie)).json(), null, 'Changing a role must revoke existing sessions')
  const login = await call('/api/auth/sign-in/email', '', { email: scout.email, password })
  assert.equal(login.status, 200)
  const promotedCookie = cookieFrom(login)
  assert.equal((await (await call('/api/auth/get-session', promotedCookie)).json()).user.role, 'admin')
  assert.equal((await call('/api/admin/users', admin.cookie, { userId: scout.id, role: 'scout' }, 'PATCH')).status, 200)
  assert.equal((await call('/api/admin/users', promotedCookie)).status, 401)
  const stream = await call('/api/chat', admin.cookie, { prompt: 'Find LP prospects', scope: 'LP relationships' })
  assert.equal(stream.status, 200)
  assert.match(await stream.text(), /Alder Grove Capital/)
  const streaming = await promisify(execFile)(process.execPath, ['scripts/check-stream.mjs', base], { env: { ...process.env, VITAMIN_C_TEST_SESSION_COOKIE: admin.cookie } })
  process.stdout.write(streaming.stdout)
  const signout = await call('/api/auth/sign-out', admin.cookie, {})
  assert.equal(signout.status, 200)
  assert.equal(await (await call('/api/auth/get-session', admin.cookie)).json(), null)
  console.log('Auth checks passed: signup/signin/signout, password hashing, cookie flags, protected routes, scout restrictions, forged-role rejection, origin checks, role management, and immediate session revocation.')
} finally {
  // Only delete accounts whose exact IDs this run received from signup.
  if (createdIds.length) await db.delete(user).where(inArray(user.id, createdIds))
  await pool.end()
}
