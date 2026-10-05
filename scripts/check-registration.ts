import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { betterAuth } from 'better-auth/minimal'
import { memoryAdapter } from 'better-auth/adapters/memory'
import { workspaceAuthPolicy } from '../src/server/auth'

// Exercise the actual app policy through Better Auth with disposable in-memory data.
const database = { user: [], session: [], account: [], verification: [] }
const base = 'https://registration-test.example.invalid'
const auth = betterAuth({
  ...workspaceAuthPolicy,
  database: memoryAdapter(database),
  baseURL: base,
  secret: randomUUID() + randomUUID(),
  trustedOrigins: [base],
  rateLimit: { enabled: false },
})
const password = 'Disposable-registration-password-123!'
const signup = (email: string, extra: Record<string, unknown> = {}) => auth.handler(new Request(base + '/api/auth/sign-up/email', {
  method: 'POST', headers: { 'content-type': 'application/json', origin: base },
  body: JSON.stringify({ name: 'Registration test', email, password, ...extra }),
}))
for (const email of ['person@gmail.com', 'person@vitaminc.vc.example.com', 'person@sub.vitaminc.vc', 'person@notvitaminc.vc']) {
  const response = await signup(email)
  assert.equal(response.status, 403, email)
  assert.equal((await response.json()).code, 'email_not_allowed')
}
assert.equal(database.user.length, 0, 'Rejected requests must not persist users')
const response = await signup('person@VITAMINC.VC', { role: 'admin', emailVerified: true })
assert.equal(response.status, 200)
const created = await response.json()
assert.equal(created.user.email, 'person@vitaminc.vc')
assert.equal(created.user.role, 'scout', 'Signup cannot grant admin access')
assert.equal(created.user.emailVerified, false, 'Signup cannot forge Google/email verification')
assert.equal(database.user.length, 1)
const login = await auth.handler(new Request(base + '/api/auth/sign-in/email', {
  method: 'POST', headers: { 'content-type': 'application/json', origin: base },
  body: JSON.stringify({ email: created.user.email, password }),
}))
assert.equal(login.status, 200)
console.log('Registration checks passed: external/spoofed domains rejected before persistence, case-insensitive Vitamin-C signup and password sign-in, scout-only roles, and no forged verification. All data stayed in memory.')
