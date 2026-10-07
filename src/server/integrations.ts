import type { ConnectorOverview, IntegrationSettings } from '../lib/integration-types'
import { getFundThesis, getPortfolio, clearPortfolioCache } from './airtable'
import { connectionSecret, readIntegrationState, updateIntegrationState } from './integration-store'
import { emailKnowledgeClient, emailContainer, hasEmailKnowledge } from './knowledge'
import { listNotionPages, readNotionDocuments } from './notion'
import { screenEmail, type ScreeningEmail } from './screening'

export async function connectorOverview(): Promise<ConnectorOverview> {
  const state = await readIntegrationState(), checked = new Date().toISOString()
  const [portfolio, gmail] = await Promise.allSettled([
    getPortfolio(),
    hasEmailKnowledge() ? emailKnowledgeClient().search.documents({ q: 'Vitamin-C', containerTag: emailContainer, limit: 1 }) : Promise.reject(Error('Connect your mailbox to enable email knowledge.')),
  ])
  const connections = state.connections.filter(c => !['airtable', 'gmail-pilot'].includes(c.id))
  connections.unshift({ id: 'airtable', provider: 'airtable', name: 'Portfolio', account: 'Vitamin°C portfolio', status: portfolio.status === 'fulfilled' ? 'connected' : 'error', method: 'Read-only API', lastChecked: checked, ...(portfolio.status === 'fulfilled' ? { documentCount: portfolio.value.companies.length } : { error: portfolio.reason instanceof Error ? portfolio.reason.message : 'Airtable is unavailable.' }) })
  // This checks indexed knowledge access, not the health of n8n's scheduled executions.
  connections.unshift({ id: 'gmail-pilot', provider: 'gmail', name: 'Vitamin-C email knowledge', account: 'luke@vitaminc.vc', status: gmail.status === 'fulfilled' ? 'connected' : 'error', method: 'Indexed inbox', lastChecked: checked, ...(gmail.status === 'rejected' ? { error: 'Email knowledge could not be verified. Check the mailbox connection.' } : {}) })
  if (!connections.some(c => c.id === 'notion')) connections.push({ id: 'notion', provider: 'notion', name: 'Notion workspace', status: 'disconnected', method: 'Selected pages' })
  // Additional mailboxes will use our Google OAuth and n8n ingestion path.
  // Keep onboarding unavailable until authorization and workflow routing are configured.
  return { connections, settings: state.settings, capabilities: { oauth: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GMAIL_SYNC_ENABLED === 'true'), screening: !!process.env.OPENAI_API_KEY, airtable: portfolio.status === 'fulfilled', notion: !!connectionSecret(state, 'notion', 'NOTION_API_KEY') }, storage: 'local' }
}
const text = (value: unknown, limit: number) => { if (typeof value !== 'string' || value.length > limit) throw Error('A field is missing or exceeds its length limit.'); return value.trim() }
const strings = (value: unknown, limit: number) => { if (!Array.isArray(value) || value.length > limit || value.some(v => typeof v !== 'string' || v.length > 250)) throw Error('Enter a valid exclusion list.'); return [...new Set(value.map(v => v.trim()).filter(Boolean))] as string[] }
export function validateSettings(value: unknown): IntegrationSettings {
  if (!value || typeof value !== 'object') throw Error('Invalid settings.')
  const v = value as IntegrationSettings
  if (!v.thesis || !v.screening || v.screening.mode !== 'enforced' || v.screening.model !== 'gpt-6-luna') throw Error('Live screening must remain enforced. The screening model is Luna.')
  if ([v.portfolioScoutAccess, v.notionScoutAccess, v.thesis.scoutAccess].some(b => typeof b !== 'boolean')) throw Error('Choose valid access settings.')
  const sourceUrl = text(v.thesis.sourceUrl, 2000)
  if (sourceUrl && !/^https:\/\//i.test(sourceUrl)) throw Error('Use an HTTPS source URL.')
  return { portfolioScoutAccess: v.portfolioScoutAccess, notionScoutAccess: v.notionScoutAccess, thesis: { text: text(v.thesis.text, 30_000), assessment: text(v.thesis.assessment, 30_000), sourceUrl, updatedAt: new Date().toISOString(), scoutAccess: v.thesis.scoutAccess }, screening: { mode: 'enforced', model: 'gpt-6-luna', blockedSenders: strings(v.screening.blockedSenders, 100), blockedLabels: strings(v.screening.blockedLabels, 100) } }
}
export async function saveSettings(value: unknown) {
  const settings=validateSettings(value),revision=(value as IntegrationSettings).thesis.updatedAt
  await updateIntegrationState(state=>{if(state.settings.thesis.updatedAt!==revision)throw Error('Settings changed in another session. Reload before saving.');settings.thesis.origin=settings.thesis.text===state.settings.thesis.text?(state.settings.thesis.origin||'airtable'):'workspace';state.settings=settings})
  return {settings}
}
export async function refreshThesis() {
  const state = await readIntegrationState(), token = connectionSecret(state, 'airtable', 'AIRTABLE_API_KEY')
  const thesis = await getFundThesis(token)
  const saved=await updateIntegrationState(state => { state.settings.thesis = { ...state.settings.thesis, ...thesis, origin:'airtable', updatedAt: new Date().toISOString() };return state.settings.thesis })
  return { thesis:saved }
}
export async function connectNotion(value: unknown) {
  const token = text(value, 500)
  if (!/^(ntn_|secret_)[A-Za-z0-9_-]+$/.test(token)) throw Error('Enter the Notion integration secret.')
  const resources = await listNotionPages(token)
  await updateIntegrationState(state => {
    state.credentials.notion = token
    state.documents = state.documents.filter(d => d.connectionId !== 'notion'); state.notionPages = []
    state.connections = state.connections.filter(c => c.id !== 'notion')
    state.connections.push({ id: 'notion', provider: 'notion', name: 'Notion workspace', status: 'pending', method: 'Selected pages', lastChecked: new Date().toISOString(), documentCount: 0 })
  })
  return { resources }
}
export async function notionResources() { const state = await readIntegrationState(); const token = connectionSecret(state, 'notion', 'NOTION_API_KEY'); if (!token) throw Error('Connect a Notion integration first.'); return { resources: await listNotionPages(token), selected: state.notionPages } }
export async function syncNotion(values: unknown) {
  const ids = strings(values, 20); if (!ids.length) throw Error('Select at least one Notion page or database.')
  const state = await readIntegrationState(), token = connectionSecret(state, 'notion', 'NOTION_API_KEY')
  if (!token) throw Error('Connect Notion first.')
  const resources = await listNotionPages(token), selected = resources.filter(r => ids.includes(r.id))
  if (selected.length !== ids.length) throw Error('Select only pages shared with this integration.')
  try {
    const documents = await readNotionDocuments(token, selected)
    await updateIntegrationState(current => {
      if (connectionSecret(current, 'notion', 'NOTION_API_KEY') !== token) throw Error('The Notion connection changed. Please sync again.')
      current.documents = [...current.documents.filter(d => d.connectionId !== 'notion'), ...documents]; current.notionPages = ids
      current.connections = current.connections.filter(c => c.id !== 'notion')
      current.connections.push({ id: 'notion', provider: 'notion', name: 'Notion workspace', status: 'connected', method: 'Selected pages', documentCount: documents.length, lastSync: new Date().toISOString() })
    })
    return { documentCount: documents.length }
  } catch (error) { await updateIntegrationState(current => { const connection = current.connections.find(c => c.id === 'notion'); if (connection) { connection.status = 'error'; connection.error = 'The selected pages could not be synced. Retry to restore access.' } }); throw error }
}
export async function testScreening(value: unknown,draftPolicy?:unknown) {
  if (!value || typeof value !== 'object') throw Error('Enter a message to screen.')
  const v = value as ScreeningEmail, state = await readIntegrationState()
  const email: ScreeningEmail = { from: text(v.from, 500), subject: text(v.subject, 2000), body: text(v.body, 100_000), labels: strings(v.labels || [], 100) }
  if (v.attachments) { if (!Array.isArray(v.attachments) || v.attachments.length > 20) throw Error('Too many attachments.'); email.attachments = v.attachments.map(a => ({ name: text(a.name, 500), ...(a.text === undefined ? {} : { text: text(a.text, 100_000) }) })) }
  const policy=draftPolicy===undefined?state.settings.screening:validateSettings({...state.settings,screening:draftPolicy}).screening
  return { result: await screenEmail(email, policy), enforced: false }
}
export async function refreshPortfolio() { clearPortfolioCache(); return getPortfolio(true) }
