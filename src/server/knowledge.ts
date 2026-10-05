import Supermemory from 'supermemory'
import { readFileSync } from 'node:fs'
import { parse } from 'dotenv'
import type { ChatResult, Source } from '@/lib/mock-data'
import type { SearchDocumentsResponse } from 'supermemory/resources/search'
import type { Role } from '@/lib/access'
import { sourceTitle } from '../lib/source-presentation'

// Roles determine access. Neither request payloads nor retrieved text can choose tags.
export const emailContainer = 'vitaminc_email_admin'
export function knowledgeKey() {
  if (process.env.NODE_ENV !== 'production') {
    try { return parse(readFileSync('.env.local')).SUPERMEMORY_API_KEY || process.env.SUPERMEMORY_API_KEY } catch { /* fall through to deployment environment */ }
  }
  return process.env.SUPERMEMORY_API_KEY
}
export const hasEmailKnowledge = () => !!knowledgeKey()
export function emailKnowledgeClient() {
  const apiKey = knowledgeKey()
  if (!apiKey) throw new Error('Email knowledge is not connected.')
  return new Supermemory({ apiKey, timeout: 20000, maxRetries: 1, logLevel: 'off' })
}
const quoteText = (text: string) => text.replace(/[\\`*_{}\[\]()<>!#|]/g, '\\$&')
const metadataText = (metadata: Record<string, unknown> | null, key: string) => typeof metadata?.[key] === 'string' ? metadata[key] as string : ''
export function mergePassages(passages: string[]) {
  let merged = ''
  for (const passage of passages) {
    if (!merged) { merged = passage; continue }
    if (merged.includes(passage)) continue
    if (passage.includes(merged)) { merged = passage; continue }
    let combined = false
    for (let overlap = Math.min(merged.length, passage.length); overlap >= 32; overlap--) {
      if (merged.endsWith(passage.slice(0, overlap))) { merged += passage.slice(overlap); combined = true; break }
      if (passage.endsWith(merged.slice(0, overlap))) { merged = passage + merged.slice(overlap); combined = true; break }
    }
    if (!combined) merged += '\n\n…\n\n' + passage
  }
  return merged
}
export function gmailSourceURL(threadId: string,mailbox='luke@vitaminc.vc') {
  return /^[a-f0-9]+$/i.test(threadId) ? `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(mailbox)}#all/${threadId}` : undefined
}
export async function retrieveEmailKnowledge(prompt: string, role: Role, signal?: AbortSignal): Promise<ChatResult> {
  if (role !== 'admin') throw new Error('Email knowledge requires admin access.')
  const result = await emailKnowledgeClient().search.documents({ q: prompt, containerTag: emailContainer, limit: 4, chunkThreshold: .5, includeFullDocs: false, includeSummary: false, rerank: true }, { signal })
  const sources = emailSources(result, prompt)
  return emailAnswer(sources)
}
export async function retrieveEmailSources(prompt: string, role: Role, signal?: AbortSignal) {
  if (role !== 'admin') throw new Error('Email knowledge requires admin access.')
  const result = await emailKnowledgeClient().search.documents({ q: prompt, containerTag: emailContainer, limit: 6, chunkThreshold: .5, includeFullDocs: false, includeSummary: false, rerank: true }, { signal })
  const sources = emailSources(result, prompt)
  return Promise.all(sources.map(async source => ({ ...source, ...await retrieveFullEmail(source.id, role, signal), excerpt: source.excerpt })))
}
export async function retrieveFullEmail(id: string, role: Role, signal?: AbortSignal): Promise<Source> {
  if (role !== 'admin') throw new Error('Email knowledge requires admin access.')
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) throw new Error('Email unavailable.')
  const document = await emailKnowledgeClient().documents.get(id, { signal })
  const raw = document.metadata
  const m = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : null
  if (!document.containerTags?.includes(emailContainer) || m?.visibility!=='admin' || m.mailbox!=='luke@vitaminc.vc' || m.sourceType!=='email') throw new Error('Email unavailable.')
  if (document.status!=='done' || !document.content?.trim()) throw new Error('The full email is still indexing or unavailable.')
  // Search returns custom IDs; preserve the requested ID so saved cards match their hydrated source.
  return { id, title: sourceTitle(metadataText(m, 'subject') || document.title || 'Email'), provider: 'Gmail', excerpt: document.content, content: document.content, receivedAt: metadataText(m, 'receivedAt'), from: metadataText(m, 'from'), to: metadataText(m, 'to'), attachments: attachmentMetadata(m), sourceUrl: gmailSourceURL(metadataText(m, 'gmailThreadId')) }
}
export function queryEntities(prompt:string) {
  const text=prompt.replace(/^(?:compare|prepare|brief|show|summarize|assess|find|tell|search|please)\s+/gmi,'')
  return [...new Set([...(text.match(/\b[A-Z][a-z]+\w*[A-Z][a-z]+\w*\b/g)||[]),...(text.match(/\b[A-Z][a-z]+(?:\s+(?:(?:on|of|the|and)\s+)?[A-Z][a-z]+){1,3}\b/g)||[])])]
}
function attachmentMetadata(metadata: Record<string, unknown> | null): Source['attachments'] {
  let raw: unknown = metadata?.attachments
  if (typeof raw === 'string') { try { raw = JSON.parse(raw) } catch { return [] } }
  if (!Array.isArray(raw) && Array.isArray(metadata?.attachmentNames)) raw = metadata.attachmentNames.map(name => ({ name }))
  if (!Array.isArray(raw)) return []
  return raw.filter(item => item && typeof item === 'object' && typeof item.name === 'string').slice(0,20).map(item => ({ name:item.name.slice(0,250), ...(typeof item.mimeType==='string'?{mimeType:item.mimeType}:{}), ...(typeof item.size==='number' && Number.isFinite(item.size)?{size:item.size}:{}) }))
}
export function emailSources(result: SearchDocumentsResponse, prompt = ''): Source[] {
  const stopwords = new Set('how do does can what are is the a an my me your our about help vitamin email inbox tell please for with and or to of in on at from by as it this that these those i we you they its their be been being have has had will would could should latest recent update updates using use based according give brief briefing prepare next founder call cover three questions question show summarize summary before after more most any all into'.split(' '))
  const terms = [...new Set(prompt.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) || [])].filter(term => !stopwords.has(term)).slice(0, 25)
  const normalizeEntity=(value:string)=>value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()
  const namedEntities = queryEntities(prompt).map(normalizeEntity)
  const termMatches = (content: string) => terms.filter(term => content.toLowerCase().includes(term)).length
  return result.results.flatMap(document => {
    const m = document.metadata
    // Defense in depth: only emails from the configured mailbox with the approved scope.
    if (m?.visibility !== 'admin' || m?.mailbox !== 'luke@vitaminc.vc' || m?.sourceType !== 'email') return []
    const documentText=[metadataText(m,'subject'),document.title,...document.chunks.map(chunk=>chunk.content)].join(' ').toLowerCase()
    if (namedEntities.length && !namedEntities.some(entity=>normalizeEntity(documentText).includes(entity))) return []
    // Keep related facts from the best two passages; remove overlap without inventing a summary.
    const titleMatch = termMatches(metadataText(m, 'subject') || document.title || '') > 0
    const excerpts = document.chunks.filter(chunk => chunk.isRelevant && (!terms.length || titleMatch || termMatches(chunk.content) > 0)).sort((a, b) => termMatches(b.content) - termMatches(a.content) || b.score - a.score).slice(0, 3).map(chunk => chunk.content.trim())
    const excerpt = mergePassages(excerpts)
    if (!excerpt) return []
    return [{ id: document.documentId, title: sourceTitle(metadataText(m, 'subject') || document.title || 'Email'), provider: 'Gmail', excerpt: excerpt.slice(0, 18000), receivedAt: metadataText(m, 'receivedAt'), from: metadataText(m, 'from'), to: metadataText(m, 'to'), attachments:attachmentMetadata(m), sourceUrl: gmailSourceURL(metadataText(m, 'gmailThreadId')) }]
  })
}
export function emailAnswer(sources: Source[]): ChatResult {
  // Quote source evidence directly. A synthesis model is intentionally optional; no invented facts.
  const text = sources.length ? `I found ${sources.length === 1 ? 'this email' : 'these emails'} in your Vitamin-C inbox. Here ${sources.length === 1 ? 'is the matching passage' : 'are the matching passages'}:\n\n${sources.map((source, i) => `**${quoteText(source.title.replace(/[\r\n]/g, ' '))}** [${i + 1}]\n\n${quoteText(source.excerpt.length > 2200 ? source.excerpt.slice(0, 2200) + '\n…' : source.excerpt).split('\n').map(line => `> ${line}  `).join('\n')}`).join('\n\n')}` : 'I couldn’t find matching evidence in the indexed Vitamin-C emails. Try the company name, email subject, or a specific detail. Newly received emails may still be indexing.'
  return { text, sources, activities: [{ primary: 'Searched indexed inbox emails', secondary: `${sources.length} matching ${sources.length === 1 ? 'email' : 'emails'}` }], tools: [], followUps: [] }
}
