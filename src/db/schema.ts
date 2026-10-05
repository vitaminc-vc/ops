import { sql } from 'drizzle-orm'
import { boolean, check, index, pgPolicy, pgRole, pgSchema, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

// Deliberately outside Supabase's exposed public schema and reserved auth schema.
export const vitaminAuth = pgSchema('vitamin_auth')
export const vitaminAppRole = pgRole('vitamin_c_app').existing()
const serverAccess = () => pgPolicy('vitamin_c_server_access', { for: 'all', to: vitaminAppRole, using: sql`true`, withCheck: sql`true` })
const date = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' })

export const user = vitaminAuth.table('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  role: text('role', { enum: ['admin', 'scout'] }).notNull().default('scout'),
  createdAt: date('created_at').notNull().defaultNow(),
  updatedAt: date('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
}, table => [
  check('user_role_check', sql`${table.role} in ('admin', 'scout')`),
  uniqueIndex('user_email_lower_unique').on(sql`lower(${table.email})`),
  index('user_role_idx').on(table.role),
  serverAccess(),
]).enableRLS()

export const session = vitaminAuth.table('session', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: date('expires_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: date('created_at').notNull().defaultNow(),
  updatedAt: date('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
}, table => [index('session_user_idx').on(table.userId), index('session_expiry_idx').on(table.expiresAt), serverAccess()]).enableRLS()

export const account = vitaminAuth.table('account', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: date('access_token_expires_at'),
  refreshTokenExpiresAt: date('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: date('created_at').notNull().defaultNow(),
  updatedAt: date('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
}, table => [index('account_user_idx').on(table.userId), uniqueIndex('account_provider_unique').on(table.providerId, table.accountId), serverAccess()]).enableRLS()

export const verification = vitaminAuth.table('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: date('expires_at').notNull(),
  createdAt: date('created_at').notNull().defaultNow(),
  updatedAt: date('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
}, table => [index('verification_identifier_idx').on(table.identifier), index('verification_expiry_idx').on(table.expiresAt), serverAccess()]).enableRLS()

export const schema = { user, session, account, verification }
