import { config } from 'dotenv'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { sql } from 'drizzle-orm'
import { createDatabase } from '../src/server/db'
import { databaseURL, targetProjectRef } from '../src/server/env'

config({ path: '.env.local', quiet: true })
const url = new URL(databaseURL(true))
if (!url.hostname.includes(targetProjectRef) && !decodeURIComponent(url.username).endsWith(`.${targetProjectRef}`)) throw new Error('Migration stopped: the database URL does not identify the Vitamin°C project.')
const { db, pool } = createDatabase(true)
try {
  const actor = await db.execute(sql`select current_user as role`)
  if (actor.rows[0]?.role === 'vitamin_c_app') throw new Error('The app login cannot run migrations. Set DATABASE_MIGRATION_URL to a privileged database connection, or apply the SQL through the dashboard.')
  await migrate(db, { migrationsFolder: './drizzle', migrationsSchema: 'vitamin_migrations' })
  await db.execute(sql`REVOKE ALL ON SCHEMA vitamin_migrations FROM PUBLIC, anon, authenticated`)
  await db.execute(sql`REVOKE ALL ON ALL TABLES IN SCHEMA vitamin_migrations FROM PUBLIC, anon, authenticated`)
  await db.execute(sql`ALTER TABLE vitamin_migrations.__drizzle_migrations ENABLE ROW LEVEL SECURITY`)
  console.log(`Applied Drizzle migrations to Vitamin°C (${targetProjectRef}).`)
} catch (error) {
  console.error(error instanceof Error && error.message.startsWith('The app login cannot run migrations.') ? error.message : 'Migration failed. Check the migration credentials, connection details, and SSL certificate. No credentials were logged.')
  process.exitCode = 1
} finally { await pool.end() }
