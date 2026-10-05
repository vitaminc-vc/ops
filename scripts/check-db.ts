import { config } from 'dotenv'
import { sql } from 'drizzle-orm'
import type { TLSSocket } from 'node:tls'
import { createDatabase } from '../src/server/db'
config({ path: '.env.local', quiet: true })
const { db, pool } = createDatabase()
try {
  const result = await db.execute(sql`select c.relname as table_name, c.relrowsecurity as rls_enabled from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'vitamin_auth' and c.relkind = 'r' order by c.relname`)
  if (result.rows.length !== 4 || result.rows.some(row => !row.rls_enabled)) throw new Error('Auth schema or RLS configuration is incomplete.')
  const grants = await db.execute(sql`select has_schema_privilege('anon','vitamin_auth','USAGE') as anon_access, has_schema_privilege('authenticated','vitamin_auth','USAGE') as authenticated_access`)
  if (grants.rows.some(row => row.anon_access || row.authenticated_access)) throw new Error('Auth schema is exposed to the Data API roles.')
  // Through Supavisor, pg_stat_ssl describes the pooler-to-Postgres hop.
  // Inspect this application's actual TLS connection to the pooler instead.
  const client = await pool.connect()
  try {
    const socket = (client as unknown as { connection: { stream: TLSSocket } }).connection.stream
    if (!socket.encrypted || !socket.authorized) throw new Error('The app connection is not encrypted and certificate-verified.')
  } finally { client.release() }
  console.log('Database verified: four private auth tables, RLS enabled, Data API access denied, encrypted connection.')
} catch {
  console.error('Database verification failed. Check credentials, migrations, and private-schema permissions. No credentials were logged.')
  process.exitCode = 1
} finally { await pool.end() }
