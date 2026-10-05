import type { Role } from '../lib/access'
import type { Source } from '../lib/mock-data'
import { readIntegrationState } from './integration-store'
import { getPortfolio, portfolioBase, companyTable } from './airtable'
import { hasEmailKnowledge, retrieveEmailSources } from './knowledge'

const stopwords=new Set('the and for with from what this that about their your our have has are does please show tell company companies fund notion know knowledge all using latest'.split(' '))
export function knowledgeTerms(query:string){return [...new Set(query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)||[])].filter(term=>!stopwords.has(term))}
export async function retrieveWorkspaceSources(query:string,role:Role,scope:string,signal?:AbortSignal) {
  const state=await readIntegrationState(),sources:Source[]=[],issues:string[]=[]
  const wantsThesis=/thesis|assess|temp check|invest|climate|deal flow|startup|\bfit\b|focus/i.test(query)
  if(wantsThesis&&(role==='admin'||state.settings.thesis.scoutAccess)&&state.settings.thesis.text.trim()) {
    sources.push({id:'workspace-thesis',title:'Vitamin-C investment thesis',provider:state.settings.thesis.origin==='workspace'?'Fund settings':'Airtable',excerpt:state.settings.thesis.text,sourceUrl:state.settings.thesis.sourceUrl})
    if(state.settings.thesis.assessment.trim())sources.push({id:'assessment-guidance',title:'Assessment guidance',provider:'Fund settings',excerpt:state.settings.thesis.assessment})
  }
  const jobs:Promise<void>[]=[]
  if(role==='admin'&&hasEmailKnowledge())jobs.push((async()=>{try{sources.push(...await retrieveEmailSources(query,role,signal))}catch{if(signal?.aborted)throw signal.reason;issues.push('Email lookup is unavailable.')}})())
  if(role==='admin'||state.settings.portfolioScoutAccess)jobs.push((async()=>{
    try{
      const portfolio=await getPortfolio(),terms=knowledgeTerms(query)
      const matched=portfolio.companies.filter(c=>terms.some(term=>c.name.toLowerCase().includes(term)))
      const general=/portfolio|holdings|financial|capital invested/i.test(query)||scope==='Portfolio companies'
      if(general){const reported=portfolio.companies.filter(c=>c.investedEUR!==null);sources.push({id:'airtable-portfolio-overview',title:'Current portfolio records',provider:'Airtable',sourceUrl:`https://airtable.com/${portfolioBase}/${companyTable}`,excerpt:JSON.stringify({companyCount:portfolio.companies.length,companies:portfolio.companies.map(c=>c.name),reportedCapitalEUR:reported.length?reported.reduce((total,c)=>total+c.investedEUR!,0):null,companiesReportingCapital:reported.length,companiesWithFinancialReports:portfolio.companies.filter(c=>c.financialSourceUrl).length,sourceWarning:portfolio.warning||null,fetchedAt:portfolio.fetchedAt})})}
      for(const c of matched.slice(0,4))sources.push({id:`airtable_${c.id}`,title:`${c.name} · Company record`,provider:'Airtable',sourceUrl:c.sourceUrl,excerpt:JSON.stringify({...c,missingFields:'Null or empty fields are unreported, never zero or a fictional replacement.'}),content:[c.name,`Legal name: ${c.legalName||'Unreported'}`,`Sector: ${c.sector||'Unreported'}`,`Stage: ${c.stage||'Unreported'}`,`Country: ${c.country||'Unreported'}`,`Founder: ${c.founder||'Unreported'}`,`Capital invested (EUR): ${c.investedEUR??'Unreported'}`,`Ownership: ${c.ownershipPercent===null?'Unreported':`${c.ownershipPercent}%`}`,`Reporting period: ${c.period||'Unreported'}`,`Reporting currency: ${c.reportingCurrency||'Unreported'}`,`Revenue YTD: ${c.revenueYTD??'Unreported'}`,`Net cash: ${c.netCash??'Unreported'}`,`Runway end: ${c.runwayUntil||'Unreported'}`].join('\n')})
    }catch{if(signal?.aborted)throw signal.reason;issues.push('Portfolio lookup is unavailable.')}
  })())
  if((role==='admin'||state.settings.notionScoutAccess)&&state.connections.some(c=>c.id==='notion'&&c.status==='connected')) {
    const terms=knowledgeTerms(query)
    const matches=state.documents.filter(d=>d.connectionId==='notion').map(document=>({document,score:terms.reduce((score,term)=>score+(document.title.toLowerCase().includes(term)?4:document.text.toLowerCase().includes(term)?1:0),0)})).filter(d=>d.score>0).sort((a,b)=>b.score-a.score).slice(0,4)
    for(const {document}of matches){const at=Math.max(0,document.text.toLowerCase().indexOf(terms.find(t=>document.text.toLowerCase().includes(t))||'')-600);sources.push({id:document.id,title:document.title,provider:'Notion',sourceUrl:document.sourceUrl,excerpt:document.text.slice(at,at+14_000),content:document.text})}
  }
  await Promise.all(jobs)
  // Deterministic citation ordering despite independent provider requests.
  sources.sort((a,b)=>a.provider.localeCompare(b.provider)||a.id.localeCompare(b.id))
  return {sources,issues}
}
