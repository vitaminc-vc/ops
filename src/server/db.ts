import { readFileSync } from 'node:fs'
import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { schema } from '../db/schema'
import { databaseURL } from './env'

export function createDatabase(migration = false) {
  const url = new URL(databaseURL(migration))
  // URL SSL options can silently override node-postgres' verification settings.
  for (const name of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(name)
  const ca = process.env.DATABASE_SSL_CA_PATH ? readFileSync(process.env.DATABASE_SSL_CA_PATH, 'utf8') : undefined
  const pool = new pg.Pool({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
    max: migration ? 1 : 5,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    application_name: migration ? 'vitamin-c-migrations' : 'vitamin-c-platform',
  })
  pool.on('error', () => console.error('The database connection was interrupted.'))
  return { db: drizzle(pool, { schema }), pool }
}

let connection: ReturnType<typeof createDatabase> | undefined
export const getDatabase = () => (connection ??= createDatabase()).db
