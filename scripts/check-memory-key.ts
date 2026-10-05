import assert from 'node:assert/strict'
import { config } from 'dotenv'
import { mkdir, writeFile } from 'node:fs/promises'
import { emailContainer, emailKnowledgeClient, knowledgeKey, retrieveEmailSources } from '../src/server/knowledge'

config({ path: '.env.local', quiet: true })
// Replay only the already approved fictional founder fixture, under its original stable ID.
// This never sends email, changes Gmail labels, or creates a new knowledge document.
const customId = 'vitaminc_luke_gmail_1a0f317f9c5e30e9'
const client = emailKnowledgeClient(), before = await client.documents.get(customId)
const metadata = before.metadata && typeof before.metadata === 'object' && !Array.isArray(before.metadata) ? before.metadata as Record<string, unknown> : null
assert.equal(before.status, 'done')
assert.ok(before.containerTags?.includes(emailContainer))
assert.equal(metadata?.mailbox, 'luke@vitaminc.vc')
assert.equal(metadata?.sourceType, 'email')
assert.ok(before.content?.includes('Fictional EmberGrid founder simulation'))
let documentId = before.id, writeVerified = false
if (process.argv.includes('--rewrite-existing')) {
  const response = await fetch('https://api.supermemory.ai/v3/documents', {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30_000),
    headers: { Authorization: `Bearer ${knowledgeKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ customId, content: before.content, containerTag: emailContainer, taskType: 'superrag', metadata: before.metadata }),
  })
  assert.ok(response.ok, `The scoped document write returned HTTP ${response.status}.`)
  const receipt = await response.json() as { id: string }
  assert.equal(receipt.id, before.id, 'Stable IDs must preserve the existing document.')
  documentId = receipt.id; writeVerified = true
}
const document = await client.documents.get(documentId)
assert.equal(document.status, 'done', 'The document must finish indexing before verification passes.')
assert.equal(document.content, before.content)
const sources = await retrieveEmailSources('EmberGrid Cedar Lantern 42', 'admin')
const founder = sources.find(source => source.id === customId || source.id === documentId)
assert.ok(founder, 'Search must return the indexed founder email.')
assert.ok(founder.content?.includes('€37,400'))
assert.match(founder.content || '', /Cedar Lantern\s+42/)
const result = { checkedAt: new Date().toISOString(), container: emailContainer, sameDocument: true, writeVerified, indexingStatus: document.status, fullEmailRetrieved: true, secretIncluded: false }
const report = writeVerified ? 'artifacts/shared-memory-key-verification.json' : 'artifacts/shared-memory-key-readback.json'
await mkdir('artifacts', { recursive: true })
await writeFile(report, JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify(result))
