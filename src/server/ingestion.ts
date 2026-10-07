import { createHash } from 'node:crypto'
import { getPool } from './db'
import { syncCompanyToNotion } from './notion-deals'
import { parseAttachment, type IncomingAttachment, type ParsedAttachment } from './attachments'
import { screenEmail, type ScreeningEmail } from './screening'
import { readIntegrationState } from './integration-store'
import { extractCompany, saveCompany } from './company-records'
import { emailContainer, emailKnowledgeClient, knowledgeKey, gmailSourceURL } from './knowledge'

export type InboundEmail = { mailbox: string; messageId: string; threadId: string; from: string; to: string; subject: string; body: string; receivedAt: string; labels: string[]; attachments: IncomingAttachment[] }
export type IngestionResult = { id?: string; status: string; terminal: boolean; companyId?: string | null; duplicate?: boolean; attachmentCount?: number; notion?: string; screening?: string }
export function validateInbound(value: unknown): InboundEmail {
  const v = value as InboundEmail
  if (!v || typeof v !== 'object') throw Error('invalid_email')
  for (const field of ['mailbox', 'messageId', 'threadId', 'from', 'to', 'subject', 'body', 'receivedAt'] as const) if (typeof v[field] !== 'string') throw Error('invalid_email')
  if (!/^[a-f0-9]{1,100}$/i.test(v.messageId) || !/^[a-f0-9]{1,100}$/i.test(v.threadId) || v.subject.length > 2000 || v.body.length > 500_000 || v.from.length > 1000 || v.to.length > 5000) throw Error('invalid_email')
  if (!Array.isArray(v.labels) || v.labels.length > 100 || v.labels.some(l => typeof l !== 'string' || l.length > 250)) throw Error('invalid_labels')
  if (!Array.isArray(v.attachments) || v.attachments.length > 20) throw Error('invalid_attachments')
  if (v.attachments.some(a => !a || typeof a.name !== 'string' || typeof a.mimeType !== 'string' || typeof a.data !== 'string' || a.name.length > 250 || a.mimeType.length > 150)) throw Error('invalid_attachments')
  const received = new Date(v.receivedAt)
  if (Number.isNaN(received.getTime())) throw Error('invalid_email_date')
  return { ...v, mailbox: v.mailbox.toLowerCase(), receivedAt: received.toISOString() }
}
export function ingestionId(mailbox: string, messageId: string) {
  return mailbox === 'luke@vitaminc.vc' ? `vitaminc_luke_gmail_${messageId}` : `vitaminc_gmail_${createHash('sha256').update(mailbox + ':' + messageId).digest('hex')}`
}
export const ingestionContent = (email: InboundEmail, attachments: ParsedAttachment[]) => `Email subject: ${email.subject}\nFrom: ${email.from}\nTo: ${email.to}\nDate: ${email.receivedAt}\nMailbox: ${email.mailbox}\n\n${email.body}${attachments.map(a => `\n\nAttachment: ${a.name}\n${a.text}`).join('')}`

export async function ingestEmail(email: InboundEmail, trustedMailbox = 'luke@vitaminc.vc'): Promise<IngestionResult> {
  if (email.mailbox !== trustedMailbox) throw Error('mailbox_not_authorized')
  if (email.labels.some(label => ['SENT', 'DRAFT', 'SPAM', 'TRASH'].includes(label))) return { status: 'skipped', terminal: true }
  const id = ingestionId(email.mailbox, email.messageId), pool = getPool(), client = await pool.connect()
  let locked = false
  try {
    locked = (await client.query('select pg_try_advisory_lock(hashtextextended($1,0)) as locked', [id])).rows[0].locked
    if (!locked) return { id, status: 'processing', terminal: false }
    const existing = (await client.query('select * from vitamin_data.ingestions where id=$1', [id])).rows[0]
    if (existing?.status === 'indexing' && existing.memory_id) return refreshIngestion(id)
    if (existing?.status === 'indexed') return { id, status: 'indexed', terminal: true, companyId: existing.company_id, duplicate: true }
    if (existing?.status === 'excluded') return { id, status: 'excluded', terminal: true, duplicate: true }
    if (existing?.status === 'review') return { id, status: 'review', terminal: true, duplicate: true }
    const state = await readIntegrationState(), attachments: ParsedAttachment[] = []
    let attachmentFailure = false
    // Attachment names and content are checked together; an unreadable file holds the entire email.
    for (const attachment of email.attachments) {
      try { attachments.push(await parseAttachment(attachment)) } catch { attachmentFailure = true; break }
    }
    const screeningEmail: ScreeningEmail = { from: email.from, subject: email.subject, body: email.body, labels: email.labels,
      attachments: email.attachments.map((a, index) => ({ name: a.name, text: attachments[index]?.text })) }
    const decision = await screenEmail(screeningEmail, state.settings.screening)
    if (attachmentFailure && decision.decision === 'include') { decision.decision = 'review'; decision.category = 'uncertain'; decision.reason = 'Attachment content could not be verified.' }
    if (decision.decision !== 'include') {
      // A retry may contain a newer thread member. Reconcile an earlier accepted
      // attempt before making an excluded/review receipt terminal.
      if (existing?.decision === 'include') {
        try { await emailKnowledgeClient().documents.delete(existing.memory_id || id) }
        catch (error) { if ((error as { status?: number }).status !== 404) throw Error('memory_removal_pending') }
      }
      // No subject, sender, body, attachment names or bytes are retained for held/excluded mail.
      await client.query('BEGIN')
      try {
        await client.query('delete from vitamin_data.documents where ingestion_id=$1', [id])
        await client.query(`INSERT INTO vitamin_data.ingestions (id,mailbox,message_id,status,decision,reason) VALUES ($1,$2,$3,$4,$5,$6)
          ON CONFLICT(id) DO UPDATE SET status=EXCLUDED.status,decision=EXCLUDED.decision,reason=EXCLUDED.reason,content=NULL,company_id=NULL,memory_id=NULL,error_code=NULL,updated_at=now()`,
        [id, email.mailbox, email.messageId, decision.decision === 'exclude' ? 'excluded' : 'review', decision.decision, decision.reason])
        await client.query('COMMIT')
      } catch (error) { await client.query('ROLLBACK'); throw error }
      return { id, status: decision.decision === 'exclude' ? 'excluded' : 'review', terminal: true, screening: decision.decision }
    }
    const content = ingestionContent(email, attachments)
    const company = await extractCompany(content)
    await client.query('BEGIN')
    let companyId: string | null = null
    try {
      if (company) companyId = (await saveCompany(company, 'gmail', id, client)).id
      const stored = { ...email, attachments: attachments.map(a => ({ name: a.name, mimeType: a.mimeType, size: a.bytes.length, sha256: a.sha256 })) }
      await client.query(`INSERT INTO vitamin_data.ingestions (id,mailbox,message_id,status,decision,reason,content,company_id) VALUES ($1,$2,$3,'indexing','include',$4,$5,$6)
        ON CONFLICT(id) DO UPDATE SET status='indexing',decision='include',reason=EXCLUDED.reason,content=EXCLUDED.content,company_id=EXCLUDED.company_id,error_code=NULL,updated_at=now()`,
      [id, email.mailbox, email.messageId, decision.reason, JSON.stringify(stored), companyId])
      for (const attachment of attachments) {
        const documentId = createHash('sha256').update(id + ':' + attachment.sha256).digest('hex')
        await client.query(`INSERT INTO vitamin_data.documents (id,ingestion_id,company_id,name,mime_type,content,data,sha256) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          ON CONFLICT(id) DO NOTHING`, [documentId, id, companyId, attachment.name, attachment.mimeType, attachment.text, attachment.bytes, attachment.sha256])
      }
      await client.query('COMMIT')
    } catch (error) { await client.query('ROLLBACK'); throw error }
    try {
      const response = await fetch('https://api.supermemory.ai/v3/documents', { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30_000),
        headers: { Authorization: `Bearer ${knowledgeKey()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ customId: id, content, containerTag: emailContainer, taskType: 'superrag', metadata: {
          sourceType: 'email', provider: 'Gmail', mailbox: email.mailbox, gmailMessageId: email.messageId, gmailThreadId: email.threadId,
          subject: email.subject, from: email.from, to: email.to, receivedAt: email.receivedAt, sourceUrl: gmailSourceURL(email.threadId, email.mailbox),
          visibility: 'admin', ingestionVersion: 2, screening: 'include', companyId: companyId || '',
          attachments: JSON.stringify(attachments.map(a => ({ name: a.name, mimeType: a.mimeType, size: a.bytes.length }))),
        } }),
      })
      if (!response.ok) throw Error('memory_write_failed')
      const receipt = await response.json() as { id: string }
      if (!receipt.id) throw Error('memory_receipt_missing')
      await client.query('update vitamin_data.ingestions set memory_id=$2,updated_at=now() where id=$1', [id, receipt.id])
      const document = await emailKnowledgeClient().documents.get(receipt.id)
      const status = document.status === 'done' ? 'indexed' : document.status === 'failed' ? 'failed' : 'indexing'
      await client.query('update vitamin_data.ingestions set status=$2,updated_at=now() where id=$1', [id, status])
      const notion = companyId ? await syncCompanyToNotion(companyId) : { status: 'no_company' }
      return { id, status, terminal: status === 'indexed', companyId, attachmentCount: attachments.length, notion: notion.status }
    } catch {
      await client.query("update vitamin_data.ingestions set status='failed',error_code='memory_write_failed',updated_at=now() where id=$1", [id])
      throw Error('memory_write_failed')
    }
  } finally {
    if (locked) await client.query('select pg_advisory_unlock(hashtextextended($1,0))', [id]).catch(() => {})
    client.release()
  }
}

export async function refreshIngestion(id: string) {
  const row = (await getPool().query('select id,status,memory_id,company_id from vitamin_data.ingestions where id=$1', [id])).rows[0]
  if (!row) throw Error('ingestion_not_found')
  if (row.status === 'indexing' && row.memory_id) {
    const memory = await emailKnowledgeClient().documents.get(row.memory_id)
    if (memory.status === 'done' || memory.status === 'failed') {
      row.status = memory.status === 'done' ? 'indexed' : 'failed'
      await getPool().query('update vitamin_data.ingestions set status=$2,updated_at=now() where id=$1', [id, row.status])
    }
  }
  return { id, status: row.status, terminal: ['indexed', 'excluded', 'review'].includes(row.status), companyId: row.company_id }
}
