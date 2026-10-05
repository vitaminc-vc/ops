import { betterAuth } from 'better-auth/minimal'
import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { getSessionCookie } from 'better-auth/cookies'
import { schema } from '../db/schema'
import { getDatabase } from './db'
import { authEnvironment } from './env'
import { isRole, type WorkspaceUser } from '../lib/access'

function createAuth() {
  const google = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  return betterAuth({
    appName: 'Vitamin-C',
    ...authEnvironment(),
    database: drizzleAdapter(getDatabase(), { provider: 'pg', schema, schemaName: 'vitamin_auth' }),
    emailAndPassword: { enabled: true, disableSignUp: process.env.NODE_ENV === 'production', minPasswordLength: 12, maxPasswordLength: 128 },
    socialProviders: google ? { google: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET!, hd: 'vitaminc.vc', accessType: 'offline', prompt: 'select_account consent' } } : {},
    account: { encryptOAuthTokens: true, accountLinking: { enabled: true, allowDifferentEmails: false, requireLocalEmailVerified: true } },
    user: {
      validateUserInfo: ({ user, source }) => {
        if (source.oauth?.providerId === 'google' && (!user.emailVerified || !String(user.email).toLowerCase().endsWith('@vitaminc.vc'))) return { error: 'email_not_allowed', errorDescription: 'Use your verified Vitamin-C Google account.' }
      },
      additionalFields: { role: { type: ['admin', 'scout'], required: true, defaultValue: 'scout', input: false } },
    },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24, cookieCache: { enabled: false } },
    rateLimit: { enabled: true, window: 60, max: 60 },
    advanced: { cookiePrefix: 'vitamin-c', useSecureCookies: process.env.NODE_ENV === 'production' },
    plugins: [tanstackStartCookies()],
  })
}
let auth: ReturnType<typeof createAuth> | undefined
export const getAuth = () => auth ??= createAuth()

export async function getWorkspaceUser(headers: Headers): Promise<WorkspaceUser | null> {
  // TanStack's own CSRF cookie is not an authenticated session.
  if (!getSessionCookie(headers, { cookiePrefix: 'vitamin-c' })) return null
  const result = await getAuth().api.getSession({ headers })
  if (!result || !isRole(result.user.role)) return null
  return { id: result.user.id, name: result.user.name, email: result.user.email, image: result.user.image ?? null, role: result.user.role }
}
