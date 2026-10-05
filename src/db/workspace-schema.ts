import { sql } from 'drizzle-orm'
import { pgSchema, text, timestamp, jsonb, pgPolicy, pgRole, index, customType } from 'drizzle-orm/pg-core'

const data = pgSchema('vitamin_data')
const app = pgRole('vitamin_c_app').existing()
const access = () => pgPolicy('vitamin_c_server_access', { for: 'all', to: app, using: sql`true`, withCheck: sql`true` })
const date = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' })
const bytes = customType<{ data: Buffer }>({ dataType: () => 'bytea' })

export const companies = data.table('companies', {
  id: text('id').primaryKey(), identityKey: text('identity_key').notNull().unique(), name: text('name').notNull(),
  website: text('website'), founder: text('founder'), description: text('description'), source: text('source').notNull(),
  sourceId: text('source_id'), notionPageId: text('notion_page_id'), notionStatus: text('notion_status').notNull().default('pending'),
  createdAt: date('created_at').notNull().defaultNow(), updatedAt: date('updated_at').notNull().defaultNow(),
}, () => [access()]).enableRLS()

export const ingestions = data.table('ingestions', {
  id: text('id').primaryKey(), mailbox: text('mailbox').notNull(), messageId: text('message_id').notNull(),
  status: text('status').notNull(), decision: text('decision').notNull(), reason: text('reason').notNull(),
  content: jsonb('content'), companyId: text('company_id').references(() => companies.id), memoryId: text('memory_id'),
  errorCode: text('error_code'), createdAt: date('created_at').notNull().defaultNow(), updatedAt: date('updated_at').notNull().defaultNow(),
}, table => [index('ingestion_mailbox_idx').on(table.mailbox), index('ingestion_status_idx').on(table.status), access()]).enableRLS()

export const documents = data.table('documents', {
  id: text('id').primaryKey(), ingestionId: text('ingestion_id').notNull().references(() => ingestions.id, { onDelete: 'cascade' }),
  companyId: text('company_id').references(() => companies.id), name: text('name').notNull(), mimeType: text('mime_type').notNull(),
  content: text('content').notNull(), data: bytes('data').notNull(), sha256: text('sha256').notNull(),
  notionFileId: text('notion_file_id'), createdAt: date('created_at').notNull().defaultNow(),
}, table => [index('document_ingestion_idx').on(table.ingestionId), access()]).enableRLS()

export const mailboxes = data.table('mailboxes', {
  id: text('id').primaryKey(), userId: text('user_id').notNull(), accountId: text('account_id').notNull().unique(),
  email: text('email').notNull().unique(), status: text('status').notNull().default('connected'),
  connectedAt: date('connected_at').notNull().defaultNow(), lastSync: date('last_sync'), lastError: text('last_error'),
}, () => [access()]).enableRLS()

export const agentRuns = data.table('agent_runs', {
  id: text('id').primaryKey(), kind: text('kind').notNull(), userId: text('user_id').notNull(),
  status: text('status').notNull(), request: text('request').notNull(), result: text('result'),
  sources: jsonb('sources'), errorCode: text('error_code'),
  createdAt: date('created_at').notNull().defaultNow(), completedAt: date('completed_at'),
}, table => [index('agent_runs_created_idx').on(table.createdAt), access()]).enableRLS()
