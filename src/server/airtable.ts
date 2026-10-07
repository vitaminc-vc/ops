import { createHash } from 'node:crypto'
import { connectionSecret, readIntegrationState } from './integration-store'
import { providerJSON } from './provider-http'
import type { PortfolioCompany, PortfolioResult } from '../lib/integration-types'

export const portfolioBase = 'appiNFlTS3OLfTkxB'
export const companyTable = 'tblEkebJ6FPvbRhma'
export const financialTable = 'tblgPFVKseKE2TXLz'
const companyFields = { legalName:'fldULXEzyByxjH4vL', name:'fldAEyjZZl3CVp2Vh', sector:'fldXiyoL042tjUhCA', stage:'fldyp5oZ2UlccJxYO', website:'fld2AcfImc135YsC1', country:'fld4JQtr9auzRD9fw', founder:'flddlU0uzubL38Vcj', invested:'fldQngUXvChIpXJ74', ownership:'fldZfslyG5p2BxAqp', moic:'fld9kwLHbUgKsOOBU', employees:'fldAbVuh8sYlzpAau', description:'fldBvVKkpMVEbos10' }
const financialFields = { company:'fldYg3d3iS5aLBUlJ', name:'fldAn6IDt3yWUzcnM', currency:'fldlMeGwK0YUurQPA', submitted:'fldtSkswhA28meVvf', year:'fldU78Q6SOsr3OUFD', quarter:'fld2hylIBVf2TaPTv', period:'fldiDYmBGrPv45c5Q', runway:'fldNVTQIjzN3SVonW', revenue:'fld4nPs2Rjv0acnxY', cash:'fldsRFN1y8f5CRDdq' }
type RecordRow = { id: string; createdTime: string; fields: Record<string, unknown> }
export const finiteNumber = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null
const string = (v: unknown) => typeof v === 'string' ? v : ''
const linked = (v: unknown) => Array.isArray(v) ? v.filter(x => typeof x === 'string') as string[] : []
export function financialRank(row: RecordRow) {
  // Reporting period comes first. A late submission for an old quarter is not the latest quarter.
  const year = finiteNumber(row.fields[financialFields.year]) || Number(string(row.fields[financialFields.year]))
  const quarter = finiteNumber(row.fields[financialFields.quarter]) || Number(string(row.fields[financialFields.quarter]).replace(/^Q/i,''))
  const period = string(row.fields[financialFields.period])
  const parsedYear = year || Number(period.match(/20\d{2}/)?.[0] || 0)
  const parsedQuarter = quarter || Number(period.match(/Q([1-4])/i)?.[1] || 0)
  return parsedYear * 10 + parsedQuarter
}
export function mapPortfolio(rows: RecordRow[], financials: RecordRow[]): PortfolioCompany[] {
  return rows.flatMap(row => {
    const f = row.fields, name = string(f[companyFields.name]) || string(f[companyFields.legalName]); if (!name) return []
    // Join only by source record IDs. Never join different companies on a fuzzy name match.
    const reports = financials.filter(r => linked(r.fields[financialFields.company]).includes(row.id)).sort((a,b) => financialRank(b)-financialRank(a) || string(b.fields[financialFields.submitted]).localeCompare(string(a.fields[financialFields.submitted])))
    const report = reports[0], rf = report?.fields || {}, investedEUR=finiteNumber(f[companyFields.invested])
    // A ratio has no usable basis when the cost calculation is missing or non-finite.
    const moic=investedEUR!==null&&investedEUR>0?finiteNumber(f[companyFields.moic]):null
    return [{ id: row.id, name, legalName:string(f[companyFields.legalName]), sector:string(f[companyFields.sector]), stage:string(f[companyFields.stage]), website:safeExternalURL(string(f[companyFields.website])), country:string(f[companyFields.country]), founder:string(f[companyFields.founder]), investedEUR, ownershipPercent:finiteNumber(f[companyFields.ownership]), moic, employees:finiteNumber(f[companyFields.employees]), description:string(f[companyFields.description]), reportingCurrency:string(rf[financialFields.currency]) || null, period:string(rf[financialFields.period]) || null, submittedAt:string(rf[financialFields.submitted]) || null, runwayUntil:string(rf[financialFields.runway]) || null, revenueYTD:finiteNumber(rf[financialFields.revenue]), netCash:finiteNumber(rf[financialFields.cash]), sourceUrl:`https://airtable.com/${portfolioBase}/${companyTable}/${row.id}`, financialSourceUrl:report ? `https://airtable.com/${portfolioBase}/${financialTable}/${report.id}` : undefined }]
  })
}
export function safeExternalURL(value: string) { try { const u = new URL(value); return ['https:','http:'].includes(u.protocol) && !u.username && !u.password ? u.toString() : undefined } catch { return undefined } }
let cache: { key: string; until: number; data: PortfolioResult } | undefined
let loading: { key: string; promise: Promise<PortfolioResult> } | undefined
export const clearPortfolioCache = () => { cache = undefined; loading = undefined }
export async function airtableRows(token: string, table: string, fields: string[]): Promise<RecordRow[]> {
  const records: RecordRow[] = []; let offset: string | undefined
  do {
    const url = new URL(`https://api.airtable.com/v0/${portfolioBase}/${table}`)
    url.searchParams.set('pageSize','100'); url.searchParams.set('returnFieldsByFieldId','true')
    for (const field of fields) url.searchParams.append('fields[]',field)
    if (offset) url.searchParams.set('offset',offset)
    const page = await providerJSON<{records:RecordRow[];offset?:string}>('Airtable',url.toString(),{headers:{Authorization:`Bearer ${token}`}})
    if (!Array.isArray(page.records)) throw new Error('Airtable returned an invalid record list.')
    records.push(...page.records); offset = page.offset
    if (records.length > 10_000) throw new Error('Portfolio exceeds the configured read limit. Nothing was truncated.')
    if (offset) await new Promise(r=>setTimeout(r,260))
  } while(offset)
  return records
}
export async function getPortfolio(force = false): Promise<PortfolioResult> {
  const state = await readIntegrationState(), token = connectionSecret(state,'airtable','AIRTABLE_API_KEY')
  if (!token) throw new Error('Connect Airtable in Settings to load the portfolio.')
  const key = createHash('sha256').update(token).digest('hex')
  if (!force && cache?.key===key && cache.until>Date.now()) return cache.data
  if (loading?.key===key) return loading.promise
  const promise = (async () => {
    const [companyRows, financialRows] = await Promise.all([
      airtableRows(token,companyTable,Object.values(companyFields)),
      airtableRows(token,financialTable,Object.values(financialFields)),
    ])
    const hasInvalid = companyRows.some(r=>Object.values(r.fields).some(v=>v && typeof v==='object' && 'specialValue' in v))
    const data:PortfolioResult = { companies:mapPortfolio(companyRows,financialRows), fetchedAt:new Date().toISOString(), source:'Airtable', ...(hasInvalid ? {warning:'Some Airtable calculations are unavailable. Those figures are shown as unreported.'} : {}) }
    cache = { key, until:Date.now()+60_000, data }; return data
  })()
  loading = {key,promise}; try { return await promise } finally { if(loading?.promise===promise) loading=undefined }
}
export async function getFundThesis(token: string) {
  const rows = await airtableRows(token,'tblE4kKk9c8vaoJGl',['fldVL97UUcEtZKUxh','fldZYRZaE0LJxVQf3'])
  const row = rows.find(r=>r.id==='rec8hfLRdxpjsMDU6')
  if(!row || typeof row.fields.fldVL97UUcEtZKUxh!=='string') throw new Error('The expected fund thesis was not found.')
  return {text:row.fields.fldVL97UUcEtZKUxh,sourceUrl:'https://airtable.com/appiNFlTS3OLfTkxB/pagBQNWm1bFFlfq3J?O9sso=rec8hfLRdxpjsMDU6'}
}
