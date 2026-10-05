export type Company = {
  id: string; name: string; sector: string; theme: string; stage: string;
  invested: number; ownership: number; runway: number; updated: string;
  owner: string; founder: string; entry: number; mrr: number; cash: number;
  burn: number; headcount: number; moic: number; irr: number | null;
  impact: string; attention?: string; revenue: number[];
}

export const companies: Company[] = [
  { id: 'cirra', name: 'Cirra', sector: 'Industrial decarbonization', theme: 'Industry', stage: 'Seed', invested: 1200000, ownership: 8.4, runway: 18, updated: 'Today', owner: 'Marco', founder: 'Elena Bauer', entry: 14300000, mrr: 86000, cash: 1400000, burn: 78000, headcount: 14, moic: 1.3, irr: 19, impact: '1,240 tCO₂e avoided', revenue: [38000, 47000, 55000, 68000, 77000, 86000] },
  { id: 'solstice', name: 'Solstice', sector: 'Grid infrastructure', theme: 'Energy', stage: 'Series A', invested: 1000000, ownership: 5.2, runway: 24, updated: '27 Sep', owner: 'Sophie', founder: 'Jonas Meyer', entry: 19200000, mrr: 142000, cash: 2800000, burn: 117000, headcount: 23, moic: 1.8, irr: 28, impact: '4,600 MWh enabled', revenue: [74000, 88000, 103000, 115000, 127000, 142000] },
  { id: 'morrow', name: 'Morrow', sector: 'Circular materials', theme: 'Materials', stage: 'Seed', invested: 800000, ownership: 7.1, runway: 10, updated: '25 Sep', owner: 'Nathalie', founder: 'Amira Laurent', entry: 11300000, mrr: 42000, cash: 650000, burn: 65000, headcount: 11, moic: 1, irr: null, impact: '320 tonnes recirculated', attention: '10 months of runway', revenue: [23000, 31000, 34000, 37000, 39000, 42000] },
  { id: 'terralab', name: 'Terralab', sector: 'Carbon removal', theme: 'Carbon', stage: 'Seed', invested: 750000, ownership: 6.8, runway: 22, updated: '24 Sep', owner: 'Nathalie', founder: 'Leo Fischer', entry: 11000000, mrr: 31000, cash: 1100000, burn: 50000, headcount: 9, moic: 1.1, irr: 8, impact: '860 tCO₂ removed', revenue: [16000, 19000, 21000, 26000, 28000, 31000] },
  { id: 'fluxwell', name: 'Fluxwell', sector: 'Energy storage', theme: 'Energy', stage: 'Pre-seed', invested: 550000, ownership: 9, runway: 14, updated: '22 Sep', owner: 'Marco', founder: 'Noah Weber', entry: 6100000, mrr: 18000, cash: 700000, burn: 50000, headcount: 7, moic: 1, irr: null, impact: 'Q3 report outstanding', attention: 'Impact report outstanding', revenue: [5000, 7000, 10000, 12000, 15000, 18000] },
  { id: 'kelpworks', name: 'Kelpworks', sector: 'Ocean restoration', theme: 'Carbon', stage: 'Seed', invested: 500000, ownership: 6.2, runway: 16, updated: '20 Sep', owner: 'Sophie', founder: 'Nora Ellis', entry: 8100000, mrr: 24000, cash: 640000, burn: 40000, headcount: 8, moic: 1.2, irr: 12, impact: '42 hectares restored', revenue: [10000, 12000, 16000, 19000, 22000, 24000] },
]

export type LP = { id: string; name: string; city: string; country: string; fit: string; via: string | null; path: string; mandate: string; history: string; ticket: string; contact: string; role: string }
export const lps: LP[] = [
  { id: 'alder', name: 'Alder Grove Capital', city: 'Zurich', country: 'Switzerland', fit: 'Backs first-time climate managers with a European focus.', via: 'Sophie', path: '1st-degree connection', mandate: 'Climate and industrial innovation', history: '2 emerging venture fund commitments', ticket: '€1–3m', contact: 'Clara Meier', role: 'Investment director' },
  { id: 'northhaven', name: 'Northhaven Family Office', city: 'Copenhagen', country: 'Denmark', fit: 'Invests in early-stage deep-tech funds across Europe.', via: 'Nathalie', path: 'Through a shared advisor', mandate: 'Deep tech and the energy transition', history: '3 European venture fund commitments', ticket: '€2–5m', contact: 'Emil Hansen', role: 'Head of private markets' },
  { id: 'verden', name: 'Verden Partners', city: 'Amsterdam', country: 'Netherlands', fit: 'Long-term capital for climate funds and circular industry.', via: 'Marco', path: '1st-degree connection', mandate: 'Climate infrastructure and circularity', history: '2 specialist venture fund commitments', ticket: '€1–2m', contact: 'Eva de Vries', role: 'Investment partner' },
  { id: 'northline', name: 'Northline Capital', city: 'London', country: 'United Kingdom', fit: 'Family office with an allocation to emerging European GPs.', via: null, path: 'No shared connection found', mandate: 'Emerging European venture managers', history: '4 venture fund commitments', ticket: '€1–4m', contact: 'James Ashford', role: 'Principal' },
  { id: 'everspring', name: 'Everspring Office', city: 'Munich', country: 'Germany', fit: 'Targets specialist funds in industrial decarbonization.', via: null, path: 'No shared connection found', mandate: 'Industrial technology and climate', history: '1 emerging manager commitment', ticket: '€1–3m', contact: 'Lena Hoffmann', role: 'Portfolio director' },
]

export type Source = { id: string; title: string; provider: string; excerpt: string; content?: string; receivedAt?: string; from?: string; to?: string; sourceUrl?: string; attachments?: { name: string; mimeType?: string; size?: number }[] }
export type ToolCall = { id: string; label: string; source: string; detail: string; status: 'running' | 'complete' }
export type Activity = { primary: string; secondary?: string }
export type ChatResult = { text: string; sources: Source[]; followUps: string[]; tools: ToolCall[]; activities: Activity[] }

export function money(value: number) {
  return value >= 1000000 ? `€${(value / 1000000).toFixed(1)}m` : `€${Math.round(value / 1000)}k`
}

export function companySources(company: Company): Source[] {
  return [
    { id: `${company.id}-update`, title: `${company.name} · September update`, provider: 'Gmail', excerpt: `${company.name} shared its latest commercial milestones, operating figures, and financing plans. ${company.name === 'Cirra' ? 'A second industrial pilot is signed and is scheduled to begin in November.' : 'The team is progressing its customer pilots and next stage of growth.'}` },
    { id: `${company.id}-meeting`, title: `${company.name} · Founder check-in`, provider: 'Granola', excerpt: `Founder check-in, 18 September. Discussed customer conversion, commercial hiring, and expansion priorities. ${company.founder} requested introductions to pilot customers and advisors.` },
    { id: `${company.id}-record`, title: `${company.name} · Investment record`, provider: 'Airtable', excerpt: `Vitamin-C invested ${money(company.invested)} at an entry valuation of ${money(company.entry)}. Ownership: ${company.ownership}%. Current runway: ${company.runway} months. Monthly revenue: ${money(company.mrr)}. Headcount: ${company.headcount}.` },
  ]
}

export const thesisSource: Source = { id: 'thesis', title: 'Vitamin-C · Investment thesis', provider: 'Notion', excerpt: 'Early-stage climate and deep-tech companies, with a bridge between European technical founders and US commercial opportunities. Focus on meaningful climate impact, technical differentiation, and a credible venture case.' }

export function buildChatResult(prompt: string, scope: string): ChatResult {
  const company = companies.find(c => prompt.toLowerCase().includes(c.name.toLowerCase()))
  const selected = company ?? companies[0]
  const sources = companySources(selected)
  let text: string
  let followUps = [`Run a Temp Check for ${selected.name}`, `What changed at ${selected.name} since our last call?`]
  let activities: Activity[] = [{ primary: 'Reading company records', secondary: 'Airtable' }, { primary: 'Finding recent conversations', secondary: 'Granola' }, { primary: 'Checking founder updates', secondary: 'Gmail' }]
  let tools: ToolCall[] = sources.map(s => ({ id: s.id, label: s.provider === 'Gmail' ? 'Read founder update' : s.provider === 'Granola' ? 'Search meetings' : 'Read company record', source: s.provider, detail: s.excerpt, status: 'complete' }))

  if (/assessment|temp check|diligence|investment memo/i.test(prompt)) {
    text = `## ${selected.name} · Temp Check\n\n${selected.name} fits the fund’s focus on ${selected.sector.toLowerCase()}. Its technical differentiation and early pilot activity make it worth a closer review.\n\n### Impact\n${selected.impact}. Validate the customer baseline and measurement methodology before using the figure in an investment decision.\n\n### Team & technology\n${selected.founder} leads a team of ${selected.headcount}. The next diligence step is independently verified pilot performance and the commercial hiring plan.\n\n### Policy & venture case\nConfirm the relevant European support programs and test unit economics beyond the first customers. Vitamin-C holds ${selected.ownership}% ownership, with ${selected.runway} months of runway currently reported.\n\n**Open questions:** customer conversion milestones, verified impact evidence, and financing requirements for the next 12 months.`
  } else if (/\blps?\b|family offices?|limited partners?|\binvestors?\b|fundrais/i.test(prompt) || scope === 'LP relationships') {
    text = `## LP prospects with a path into the conversation\n\nThree family offices in the current research set have a connection through the team.\n\n- **Alder Grove Capital · Zurich:** climate and industrial innovation; connected through Sophie.\n- **Northhaven Family Office · Copenhagen:** deep tech and the energy transition; a shared advisor can introduce Nathalie.\n- **Verden Partners · Amsterdam:** climate infrastructure and circularity; connected through Marco.\n\nPrioritize mandate fit and prior commitments to emerging venture managers. Prepare a short introduction around the Europe–US bridge, then review the wording with the relationship owner before outreach.`
    sources.splice(0, sources.length, thesisSource, { id: 'lp-network', title: 'LP relationships · Team network', provider: 'Attio', excerpt: 'Research set: Alder Grove, Northhaven, and Verden. Connection owners: Sophie, Nathalie, and Marco respectively. Mandate and relationship context are held with each investor record.' })
    activities = [{ primary: 'Matching investment mandates', secondary: 'LP records' }, { primary: 'Checking existing relationships', secondary: 'Attio' }, { primary: 'Finding introduction paths', secondary: 'Team network' }]
    tools = sources.map(s => ({ id: s.id, label: s.id === 'thesis' ? 'Read investment thesis' : 'Read LP relationships', source: s.provider, detail: s.excerpt, status: 'complete' }))
    followUps = ['Draft an introduction to Alder Grove Capital', 'Compare the three LP mandates']
  } else if (/scout|sourc|new compan|opportunit/i.test(prompt) || scope === 'Deal flow') {
    text = `## Opportunities to review\n\nThese three companies align with the fund’s current climate and deep-tech themes.\n\n- **Aerolith · Berlin · Pre-seed:** industrial carbon removal. Validate the technical claims and first customer pilot.\n- **Voltform · Delft · Seed:** long-duration energy storage. Review commercial deployment economics and the founding team’s technical track record.\n- **Regrain · Lyon · Pre-seed:** circular industrial materials. Check impact measurement and the route from a pilot to repeatable contracts.\n\nCompare each company with the existing Notion pipeline before creating a new opportunity. The strongest next step is a first-call digest with founder backgrounds, deck context, and outstanding diligence questions.`
    sources.splice(0, sources.length, thesisSource, { id: 'dealflow', title: 'Deal flow · Reviewed companies', provider: 'Notion', excerpt: 'The pipeline tracks companies, founder contacts, evaluation stages, and prior investment decisions. Check for an existing company and domain before creating a new opportunity.' })
    activities = [{ primary: 'Reading the investment thesis', secondary: 'Notion' }, { primary: 'Checking prior reviews', secondary: 'Deal flow' }, { primary: 'Comparing portfolio overlap', secondary: 'Airtable' }]
    tools = sources.map(s => ({ id: s.id, label: s.id === 'thesis' ? 'Read investment thesis' : 'Read reviewed companies', source: s.provider, detail: s.excerpt, status: 'complete' }))
    followUps = ['Prepare a first-call digest for Aerolith', 'What evidence should we request from a new founder?']
  } else if (/portfolio|runway|quarter|this week/i.test(prompt) && !company) {
    text = `## Portfolio priorities\n\nAcross **6 companies**, Vitamin-C has invested **€4.8m**. Median reported runway is **17 months**.\n\n### Follow up first\n- **Morrow:** 10 months of runway. Schedule a financing check-in and review the next fundraise milestones.\n- **Fluxwell:** Q3 impact reporting is outstanding. Request the company’s report and associate it with its record.\n\n### Recent activity\nCirra signed a second industrial pilot. Solstice’s recent board discussion focused on US commercial expansion. Company updates and meeting context should be read alongside the financial figures from Airtable.`
    followUps = ['Prepare me for my next call with Morrow', 'Summarize Cirra’s September update']
  } else if (company || /call|founder|prepare/i.test(prompt)) {
    text = `## ${selected.name} · Call preparation\n\n${selected.name} is building ${selected.sector.toLowerCase()} technology. Vitamin-C invested **${money(selected.invested)}** at ${selected.stage.toLowerCase()} and holds **${selected.ownership}%** ownership.\n\n### What changed\n${selected.name === 'Cirra' ? 'The team signed a second industrial pilot and is preparing its US commercial expansion. The pilot is expected to begin in November.' : 'The latest founder update covers customer milestones, pilot activity, and the next phase of growth.'} The last check-in focused on customer conversion, hiring priorities, and useful introductions.\n\n### Questions for the conversation\n1. What needs to be true for the next pilot to become a recurring contract?\n2. Which introduction or commercial hire would have the greatest impact now?\n3. How does the growth plan affect the current **${selected.runway}-month runway**?\n\nThe financial figures come from the company record; the commercial context comes from its founder update and meeting notes.`
  } else {
    text = `## Vitamin-C’s investment context\n\nThe fund focuses on **early-stage climate and deep tech**, connecting European founders with opportunities in the US.\n\n### What to look for\n- A meaningful climate outcome with a credible measurement method.\n- Technical differentiation supported by evidence from real pilots.\n- A founding team that can build a repeatable commercial path.\n- Financing milestones that fit the company’s runway and next stage of growth.\n\nThe portfolio currently spans industrial decarbonization, energy infrastructure, circular materials, carbon removal, and ocean restoration. Use a specific company name to bring its investment record, founder correspondence, and meeting context into the conversation.`
    sources.splice(0, sources.length, thesisSource)
    activities = [{ primary: 'Reading the investment thesis', secondary: 'Notion' }, { primary: 'Reviewing portfolio themes', secondary: 'Airtable' }]
    tools = [{ id: 'thesis', label: 'Read investment thesis', source: 'Notion', detail: thesisSource.excerpt, status: 'complete' }]
    followUps = ['What needs attention in the portfolio?', 'Find LPs aligned with our thesis']
  }
  return { text, sources, followUps, tools, activities }
}
