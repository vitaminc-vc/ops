import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, ArrowUpRight, Download, FileText, NotebookPen, RefreshCw, Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { PortfolioCompany, PortfolioResult } from '../lib/integration-types'
import { usePlatform } from '../lib/platform-context'
import { Button, Mark, Modal, Picker, Stat } from './ui'
import { SourceLogo } from './source-logo'

export function usePortfolio() {
  const [data,setData]=useState<PortfolioResult|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
  const refresh=useCallback(async()=>{setLoading(true);setError('');try{const response=await fetch('/api/portfolio?refresh=1');const data=await response.json();if(!response.ok)throw Error(data.error);setData(data)}catch(error){setError(error instanceof Error?error.message:'The portfolio could not be loaded.')}finally{setLoading(false)}},[])
  useEffect(()=>{void refresh();const timer=setInterval(()=>{if(document.visibilityState==='visible')void refresh()},60_000);return ()=>clearInterval(timer)},[refresh]);return {data,loading,error,refresh}
}
const number=(value:number|null,suffix='')=>value===null?'—':`${value.toLocaleString(undefined,{maximumFractionDigits:2})}${suffix}`
export function reportedMoney(value:number|null,currency:string|null='EUR') {
  if(value===null)return '—'
  if(!currency)return `${number(value)} · currency unreported`
  try{return new Intl.NumberFormat(undefined,{style:'currency',currency,maximumFractionDigits:0}).format(value)}catch{return `${number(value)} ${currency}`}
}
const day=(value:string|null)=>value&&!Number.isNaN(Date.parse(value))?new Date(value).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):'—'
export function portfolioCSV(companies:PortfolioCompany[]) {
  const cell=(value:unknown)=>{const raw=value===null||value===undefined?'':String(value);return `"${(typeof value==='string'&&/^[=+@-]/.test(raw)?"'"+raw:raw).replaceAll('"','""')}"`}
  return [['Company','Stage','Invested EUR','Ownership percent','Reporting period','Reporting currency','Revenue YTD','Net cash','Runway end'],...companies.map(c=>[c.name,c.stage,c.investedEUR,c.ownershipPercent,c.period,c.reportingCurrency,c.revenueYTD,c.netCash,c.runwayUntil])].map(row=>row.map(cell).join(',')).join('\n')
}
function download(companies:PortfolioCompany[]) {const url=URL.createObjectURL(new Blob([portfolioCSV(companies)],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`vitamin-c-portfolio-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url)}
export function PortfolioPage() {
  const {data,loading,error,refresh}=usePortfolio(),[query,setQuery]=useState(''),[filter,setFilter]=useState('All companies'),[report,setReport]=useState(false)
  const companies=data?.companies||[],reported=companies.filter(c=>c.investedEUR!==null),financials=companies.filter(c=>c.financialSourceUrl),missing=companies.filter(c=>!c.financialSourceUrl)
  const filtered=companies.filter(c=>`${c.name} ${c.sector} ${c.country}`.toLowerCase().includes(query.toLowerCase())&&(filter!=='Missing financials'||!c.financialSourceUrl))
  return <div className="page portfolio-page"><header className="page-header"><h1>Portfolio management</h1><div className="page-header-actions"><Button disabled={loading} onClick={()=>void refresh()} aria-label="Refresh portfolio"><RefreshCw/></Button><Button disabled={!data} onClick={()=>setReport(true)}><FileText/>Export figures</Button></div></header>
    {error?<div className="response-error" role="alert"><p>{error}</p><Button onClick={()=>void refresh()}>Try again</Button></div>:loading&&!data?<p className="muted" role="status">Loading portfolio…</p>:data&&<>
      <div className="portfolio-provenance"><SourceLogo provider="Airtable"/><span>Airtable</span><span>Fetched {new Date(data.fetchedAt).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}</span></div>
      <div className="stats"><Stat label="Portfolio companies" value={companies.length}/><Stat label="Reported capital invested" value={reported.length?reportedMoney(reported.reduce((sum,c)=>sum+c.investedEUR!,0)):'—'} detail={`${reported.length} of ${companies.length} companies reported`}/><Stat label="Companies with financials" value={`${financials.length} / ${companies.length}`} detail="Latest available submissions"/></div>
      {data.warning&&<p className="portfolio-data-note">{data.warning}</p>}
      <div className="table-toolbar"><label className="search-field"><Search/><input aria-label="Search portfolio companies" placeholder="Search companies" value={query} onChange={e=>setQuery(e.target.value)}/></label><Picker value={filter} onChange={setFilter} options={['All companies','Missing financials']} label="Company filter"/></div>
      <div className="table-surface surface"><table className="companies-table"><thead><tr><th>Company</th><th className="optional-stage">Stage</th><th className="numeric">Invested</th><th className="numeric optional-ownership">Ownership</th><th className="optional-update">Reporting period</th><th className="arrow-cell"><span className="sr-only">Open company</span></th></tr></thead><tbody>{filtered.map(c=><tr key={c.id}><td><Link to="/portfolio/$companyId" params={{companyId:c.id}} className="company-link"><Mark name={c.name}/><span><strong>{c.name}</strong><small className="company-sector">{[c.sector,c.country].filter(Boolean).join(' · ')}</small></span></Link></td><td className="optional-stage muted">{c.stage||'—'}</td><td className="numeric">{reportedMoney(c.investedEUR)}</td><td className="numeric optional-ownership">{number(c.ownershipPercent,'%')}</td><td className="optional-update muted">{c.period||'Not submitted'}</td><td className="arrow-cell"><Link to="/portfolio/$companyId" params={{companyId:c.id}} aria-label={`Open ${c.name}`}><ArrowUpRight/></Link></td></tr>)}</tbody></table>{!filtered.length&&<div className="empty-state"><p>{companies.length?'No companies match your search.':'No companies are available in the portfolio base.'}</p>{companies.length>0&&<Button className="ghost" onClick={()=>{setQuery('');setFilter('All companies')}}>Clear filters</Button>}</div>}</div>
      <section className="integration-section"><h2 className="section-caption">Financial reporting</h2>{missing.length?<div className="reporting-list surface">{missing.map(c=><Link to="/portfolio/$companyId" params={{companyId:c.id}} className="activity-row" key={c.id}><FileText/><span><strong>{c.name}</strong><small>No quarterly financial submission is available</small></span><ArrowUpRight/></Link>)}</div>:<p className="muted small">Every company has an available financial submission.</p>}</section>
    </>}
    <Modal open={report} onOpenChange={setReport} title="Portfolio figures"><p className="muted">Export the available Airtable figures. Empty fields remain unreported; each company retains its reporting period and currency.</p><div className="facts"><div><span>Companies</span><strong>{companies.length}</strong></div><div><span>Financial submissions available</span><strong>{financials.length}</strong></div></div><div className="dialog-actions"><Button onClick={()=>setReport(false)}>Cancel</Button><Button className="primary" onClick={()=>download(companies)}><Download/>Export CSV</Button></div></Modal>
  </div>
}
export function CompanyPage({companyId}:{companyId:string}) {
  const {data,loading,error,refresh}=usePortfolio(),{newChat}=usePlatform(),navigate=useNavigate()
  const company=data?.companies.find(c=>c.id===companyId)
  if(loading&&!data)return <div className="page"><p className="muted" role="status">Loading company…</p></div>
  if(error||!company)return <div className="page"><Link to="/portfolio" className="back-link"><ArrowLeft/>All companies</Link><div className="response-error" role="alert"><p>{error||'This company is not in the connected portfolio.'}</p><Button onClick={()=>void refresh()}>Try again</Button></div></div>
  return <div className="page company-page"><Link to="/portfolio" className="back-link"><ArrowLeft/>All companies</Link><header className="page-header company-header"><div className="company-heading"><Mark name={company.name}/><div><h1>{company.name}</h1><p className="muted small">{[company.sector,company.stage,company.country].filter(Boolean).join(' · ')}</p></div></div><Button className="primary" onClick={()=>{newChat(`Prepare me for my next call with ${company.name}, using its available company record and correspondence.`);void navigate({to:'/'})}}><NotebookPen/>Prepare for a call</Button></header>
    <div className="company-meta"><span>Legal name <strong>{company.legalName||'Unreported'}</strong></span><span>Founder <strong>{company.founder||'Unreported'}</strong></span>{company.website&&<a href={company.website} target="_blank" rel="noopener noreferrer">Company website<ArrowUpRight/></a>}</div>
    {company.description&&<p className="company-description">{company.description}</p>}
    <div className="company-metrics surface">{[['Capital invested',reportedMoney(company.investedEUR)],['Ownership',number(company.ownershipPercent,'%')],['MOIC',number(company.moic,'×')],['Headcount',number(company.employees)]].map(([label,value])=><div key={label}><span className="caption">{label}</span><strong>{value}</strong></div>)}</div>
    <section className="integration-section"><h2 className="section-caption">Financial reporting</h2>{company.financialSourceUrl?<><p className="muted small">{company.period||'Period unreported'} · {company.reportingCurrency||'Currency unreported'} · Submitted {day(company.submittedAt)}</p><div className="company-metrics surface"><div><span className="caption">Revenue YTD</span><strong>{reportedMoney(company.revenueYTD,company.reportingCurrency)}</strong></div><div><span className="caption">Net cash</span><strong>{reportedMoney(company.netCash,company.reportingCurrency)}</strong></div><div><span className="caption">Runway end</span><strong>{day(company.runwayUntil)}</strong></div></div><a href={company.financialSourceUrl} target="_blank" rel="noopener noreferrer" className="button">View financial submission<ArrowUpRight/></a></>:<div className="company-note surface"><p>No quarterly financial submission is available for this company yet.</p></div>}</section>
    <section className="integration-section"><h2 className="section-caption">Source record</h2><a href={company.sourceUrl} target="_blank" rel="noopener noreferrer" className="document-row"><SourceLogo provider="Airtable"/><span><strong>{company.name}</strong><small>Airtable company record</small></span><ArrowUpRight/></a></section>
  </div>
}
