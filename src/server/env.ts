export const targetProjectRef = 'euaxzitprzcazefjfjuu'

export function databaseURL(migration = false) {
  const override = migration ? process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL : process.env.DATABASE_URL
  if (override) return override
  const password = process.env.SUPABASE_DB_PASSWORD
  if (!password) throw new Error('Add the Supabase database password to .env.local to finish setup.')
  const url = new URL(`postgresql://${process.env.DATABASE_HOST || 'aws-0-eu-central-1.pooler.supabase.com'}:${process.env.DATABASE_PORT || '5432'}/${process.env.DATABASE_NAME || 'postgres'}`)
  url.username = process.env.DATABASE_USER || `postgres.${targetProjectRef}`
  url.password = password
  return url.toString()
}

export function authEnvironment() {
  const secret = process.env.BETTER_AUTH_SECRET
  const baseURL = process.env.BETTER_AUTH_URL
  if (!secret || secret.length < 32) throw new Error('Set BETTER_AUTH_SECRET to a random value of at least 32 characters.')
  if (!baseURL) throw new Error('Set BETTER_AUTH_URL to the application origin.')
  const origin = new URL(baseURL).origin
  if (process.env.NODE_ENV === 'production' && !origin.startsWith('https://')) throw new Error('Production authentication requires HTTPS.')
  const port = new URL(baseURL).port || '3000'
  return { secret, baseURL: origin, trustedOrigins: process.env.NODE_ENV === 'production' ? [origin] : [origin, `http://localhost:${port}`, `http://127.0.0.1:${port}`] }
}
