import { ArrowUpRight, Check, FileText, GitBranch, Mail, Plus, Search, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { lps, type LP } from '@/lib/mock-data'
import { parseCSV } from '@/lib/csv'
import { usePlatform } from '@/lib/platform-context'
import LoadingState from './beautiful-ui/loading-state'
import { Button, Mark, Modal, Picker } from './ui'

export function LPPage() {
  const { pipeline, saveLP, lpDrafts, saveLPDraft, extraLPs: imported, addLPs, lpSearch, setLPSearch } = usePlatform()
  const { query, view, connection } = lpSearch
  const setQuery = (query: string) => setLPSearch({ query })
  const setView = (view: string) => setLPSearch({ view })
  const setConnection = (connection: string) => setLPSearch({ connection })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<LP | null>(null)
  const [drafting, setDrafting] = useState(false)
  const [draft, setDraft] = useState('')
  const [draftSaved, setDraftSaved] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importError, setImportError] = useState('')
  const [importName, setImportName] = useState('')
  const [candidates, setCandidates] = useState<LP[]>([])
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const file = useRef<HTMLInputElement>(null)
  const textArea = useRef<HTMLTextAreaElement>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  useEffect(() => { const input = textArea.current; if (input) { input.style.height = '0px'; input.style.height = `${Math.max(48, input.scrollHeight)}px` } }, [query])
  const universe = [...lps, ...imported]
  const namedGeographies = universe.filter(lp => [lp.city, lp.country].some(location => lpSearch.submitted.toLowerCase().includes(location.toLowerCase())))
  const results = /new york|united states|asia|singapore/i.test(lpSearch.submitted) ? [] : namedGeographies.length ? namedGeographies : universe
  const records = (view === 'Discover' ? results : universe.filter(lp => pipeline[lp.id])).filter(lp => connection !== 'Warm paths only' || lp.via)
  const find = () => {
    if (!query.trim()) { setError('Describe the investors you’re looking for.'); return }
    setError(''); setLoading(true); setView('Discover')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setLPSearch({ submitted: query }); setLoading(false)
    }, 900)
  }
  const openLP = (lp: LP) => { setSelected(lp); setDrafting(false); setDraftSaved(false) }
  const startDraft = () => {
    if (!selected) return
    setDraft(lpDrafts[selected.id] ?? `Hi ${selected.contact.split(' ')[0]},\n\nI wanted to introduce Vitamin-C, an early-stage venture fund connecting European climate and deep-tech founders with opportunities in the US.\n\nYour focus on ${selected.mandate.toLowerCase()} looks closely aligned with our thesis. Would you be open to a short conversation about the fund and our current portfolio?\n\nBest,\n${selected.via ?? 'Sophie'}`)
    setDraftSaved(false); setDrafting(true)
  }
  return <div className="page lp-page"><header className="page-header"><h1>LP Engine</h1><Button onClick={() => { setImportOpen(true); setCandidates([]); setImportName(''); setImportError('') }}><Upload />Import list</Button></header>
    <form className="discovery-composer surface field-group" onSubmit={e => { e.preventDefault(); find() }}><label htmlFor="lp-query" className="field-label">Find prospective LPs</label><textarea id="lp-query" ref={textArea} value={query} onChange={e => setQuery(e.target.value)} rows={2} maxLength={2000} /><div className="discovery-controls"><div className="query-tags"><span>Europe</span><span>Family office</span><span>Climate & deep tech</span></div><Button type="submit" className="primary" disabled={loading}><Search />Find LPs</Button></div>{error && <p role="alert" className="field-error">{error}</p>}</form>
    <div className="lp-toolbar"><div className="segmented" aria-label="LP view">{['Discover', 'Pipeline'].map(v => <button type="button" key={v} aria-pressed={view === v} onClick={() => setView(v)}>{v}{v === 'Pipeline' && <span> · {universe.filter(lp => pipeline[lp.id]).length}</span>}</button>)}</div><Picker value={connection} onChange={setConnection} options={['All connections', 'Warm paths only']} label="Connection filter" /></div>
    <div className="results-caption"><span>{view === 'Discover' ? `${records.length} prospects` : `${records.length} relationships`}</span><span>{records.filter(lp => lp.via).length} warm paths</span></div>
    {loading ? <div className="lp-loading surface"><LoadingState label="Looking for aligned LPs" /><Button className="ghost" onClick={() => { if (timer.current) clearTimeout(timer.current); setLoading(false) }}>Cancel</Button></div> : <div className="lp-results surface">{records.map(lp => <div key={lp.id} className="lp-row"><div className="lp-identity"><Mark name={lp.name} /><div><button type="button" className="lp-name" onClick={() => openLP(lp)}>{lp.name}</button><span className="lp-location">{lp.city}, {lp.country} · Family office</span><p>{lp.fit}</p></div></div><div className="lp-connection">{view === 'Pipeline' ? <><span className="stage-tag">{pipeline[lp.id]}</span><small>Owner · {lp.via ?? 'Sophie'}</small></> : <><span className={lp.via ? 'warm-path' : 'muted'}>{lp.via && <GitBranch size={14} />}{lp.via ? `Via ${lp.via}` : 'No warm path'}</span><small>{lp.path}</small></>}</div><Button className="review-lp" onClick={() => openLP(lp)}>Review<ArrowUpRight size={13} /></Button></div>)}{!records.length && <div className="empty-state"><Search /><h2>No matching prospects</h2><p>Try another geography or import an investor list.</p><Button onClick={() => setLPSearch({ query: 'European family offices investing in climate venture funds', submitted: 'Europe', connection: 'All connections' })}>Reset search</Button></div>}</div>}
    <Modal open={!!selected} onOpenChange={open => { if (!open) setSelected(null) }} title={drafting ? 'Draft introduction' : selected?.name ?? 'LP details'} description={selected ? drafting ? `${selected.name} · ${selected.contact}` : `${selected.city}, ${selected.country} · Family office` : undefined}>
      {selected && (drafting ? <><div className="field-group"><label className="field-label" htmlFor="lp-draft">Message</label><textarea id="lp-draft" className="styled-textarea email-draft" value={draft} onChange={e => { setDraft(e.target.value); setDraftSaved(false) }} /></div><div className="dialog-actions"><Button onClick={() => setDrafting(false)}>Back</Button><Button className="primary" disabled={draftSaved || !draft.trim()} onClick={() => { saveLPDraft(selected.id, draft); setDraftSaved(true) }}>{draftSaved ? <Check /> : <FileText />}{draftSaved ? 'Draft saved' : 'Save draft'}</Button></div><p className="sr-only" aria-live="polite">{draftSaved ? 'Draft saved.' : ''}</p></> : <><p>{selected.fit}</p><div className="facts"><div><span>Mandate</span><strong>{selected.mandate}</strong></div><div><span>Fund history</span><strong>{selected.history}</strong></div><div><span>Typical commitment</span><strong>{selected.ticket}</strong></div><div><span>Contact</span><strong>{selected.contact} · {selected.role}</strong></div>{pipeline[selected.id] && <div><span>Pipeline stage</span><Picker label="Pipeline stage" value={pipeline[selected.id]} options={['Researching', 'Intro requested', 'In conversation', 'Committed']} onChange={stage => saveLP(selected.id, stage)} /></div>}</div><h3>Connection path</h3><div className="connection-card"><GitBranch /><div><strong>{selected.via ? `Vitamin-C → ${selected.via} → ${selected.contact}` : 'No shared connection found'}</strong><p>{selected.path}</p></div></div><div className="dialog-actions"><Button disabled={!!pipeline[selected.id]} onClick={() => saveLP(selected.id)}>{pipeline[selected.id] ? <Check /> : <Plus />}{pipeline[selected.id] ? 'In pipeline' : 'Add to pipeline'}</Button><Button className="primary" onClick={startDraft}><Mail />Draft introduction</Button></div></>)}
    </Modal>
    <Modal open={importOpen} onOpenChange={setImportOpen} title="Import an LP list" description="Review new contacts before adding them to your pipeline.">
      <button type="button" className="upload-zone" onClick={() => file.current?.click()}><Upload /><strong>{importName || 'Choose a CSV file'}</strong><span>Required column: name. Optional: city, country, contact, mandate.</span></button>
      <input type="file" accept=".csv,text/csv" ref={file} hidden onChange={async e => { const chosen = e.target.files?.[0]; if (!chosen) return; setImportError(''); setImportName(chosen.name); try { if (chosen.size > 2 * 1024 * 1024) throw new Error('Choose a CSV under 2 MB.'); const parsed = parseCSV(await chosen.text()); const known = new Set(universe.map(lp => lp.name.toLowerCase().trim())); const fresh: LP[] = []; for (const row of parsed) { const name = row.name.trim(); if (known.has(name.toLowerCase())) continue; known.add(name.toLowerCase()); fresh.push({ id: crypto.randomUUID(), name, city: row.city || 'Location', country: row.country || 'Not supplied', contact: row.contact || 'Contact not supplied', role: 'Investor', via: null, path: 'No shared connection found', fit: row.mandate || 'Mandate to review', mandate: row.mandate || 'Not supplied', ticket: 'Not supplied', history: 'Not supplied' }) } setCandidates(fresh) } catch (err) { setImportError(err instanceof Error ? err.message : 'Could not read this CSV.'); setCandidates([]) } e.target.value = '' }} />
      {importError && <p className="field-error" role="alert">{importError}</p>}{importName && !importError && <div className="import-review"><h3>{candidates.length} new contacts</h3>{candidates.slice(0, 5).map(lp => <div key={lp.id}>{lp.name}<span>{lp.city}</span></div>)}{!candidates.length && <p>No new contacts. Existing names were matched and skipped.</p>}</div>}
      <div className="dialog-actions"><Button onClick={() => setImportOpen(false)}>Cancel</Button><Button className="primary" disabled={!candidates.length} onClick={() => { addLPs(candidates); candidates.forEach(lp => saveLP(lp.id)); setImportOpen(false); setView('Pipeline') }}>Add {candidates.length || ''} to pipeline</Button></div>
    </Modal>
  </div>
}
