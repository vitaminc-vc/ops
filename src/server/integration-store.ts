import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto'
import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Connector, IntegrationSettings } from '../lib/integration-types'

export type SourceDocument = { id: string; title: string; text: string; sourceUrl: string; updatedAt: string; connectionId: string }
export type PrivateState = { version: 1; settings: IntegrationSettings; connections: Connector[]; credentials: Record<string, string>; notionPages: string[]; documents: SourceDocument[] }
const seed = (): PrivateState => ({ version: 1, settings: {
  thesis: { text: 'Impact and returns are inseparable. For Vitamin°C, impact is not a constraint — it is the thesis.\n\nThe fund invests in climate mitigation and human adaptation, targeting the largest climate levers: energy, food and agriculture, and carbon removal. Check size EUR 0.5M–1.5M at pre-seed and seed.\n\nBeyond capital, Vitamin°C connects portfolio companies with academic institutions for rigorous impact validation, funds non-dilutive grants to generate scientific evidence, and pilots blended capital models where venture and philanthropy work in tandem.', assessment: '', sourceUrl: 'https://airtable.com/appiNFlTS3OLfTkxB/pagBQNWm1bFFlfq3J?O9sso=rec8hfLRdxpjsMDU6', updatedAt: '2026-10-01T00:00:00Z', scoutAccess: false },
  screening: { mode: 'off', model: 'gpt-6-luna', blockedSenders: [], blockedLabels: ['HR', 'Payroll', 'People operations'] }, portfolioScoutAccess: false, notionScoutAccess: false,
}, connections: [], credentials: {}, notionPages: [], documents: [] })

function storage() {
  if (process.env.NODE_ENV === 'production' && !process.env.INTEGRATION_STATE_DIRECTORY) throw new Error('Configure persistent integration storage before deployment.')
  return resolve(process.env.INTEGRATION_STATE_DIRECTORY || '.private')
}
function key() {
  const value = process.env.CONNECTOR_ENCRYPTION_KEY
  if (!value || !/^[a-f0-9]{64}$/i.test(value)) throw new Error('Configure the server connector encryption key.')
  return Buffer.from(value, 'hex')
}
export function encryptState(state: PrivateState) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(), iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(state), 'utf8'), cipher.final()])
  return JSON.stringify({ version: 1, iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex'), data: encrypted.toString('base64') })
}
export function decryptState(raw: string): PrivateState {
  const envelope = JSON.parse(raw), decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(envelope.iv, 'hex'))
  decipher.setAuthTag(Buffer.from(envelope.tag, 'hex'))
  const state = JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.data, 'base64')), decipher.final()]).toString('utf8'))
  if (state.version !== 1) throw new Error('Unsupported integration storage version.')
  return state
}
export async function readIntegrationState(): Promise<PrivateState> {
  try { return decryptState(await readFile(resolve(storage(), 'integrations.enc'), 'utf8')) } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return seed()
    throw error
  }
}
let writes: Promise<unknown> = Promise.resolve()
export async function updateIntegrationState<T>(change: (state: PrivateState) => T | Promise<T>): Promise<T> {
  const work = writes.then(async () => {
    const state = await readIntegrationState(), result = await change(state), dir = storage()
    await mkdir(dir, { recursive: true, mode: 0o700 })
    await chmod(dir,0o700)
    const temporary = resolve(dir, `integrations-${randomUUID()}.tmp`)
    await writeFile(temporary, encryptState(state), { mode: 0o600 }); await rename(temporary, resolve(dir, 'integrations.enc'))
    return result
  })
  writes = work.catch(() => undefined)
  return work
}
export const connectionSecret = (state: PrivateState, provider: string, env: string) => state.credentials[provider] || process.env[env] || ''
