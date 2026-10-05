import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'
import { databaseURL } from './src/server/env'
config({ path: '.env.local', quiet: true })
// Generating SQL works before the local password is supplied; migration requires it.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  schemaFilter: ['vitamin_auth', 'vitamin_data'],
  dbCredentials: { url: process.env.SUPABASE_DB_PASSWORD || process.env.DATABASE_URL ? databaseURL(true) : 'postgresql://localhost/postgres' },
})
