import { getPool } from './db'
import { readIntegrationState, connectionSecret } from './integration-store'
import { providerJSON } from './provider-http'

type NotionPage = { id: string; properties: Record<string, unknown> }
export async function hasNotionDestination() { return !!(process.env.NOTION_DEAL_DATABASE_ID && connectionSecret(await readIntegrationState(),'notion','NOTION_API_KEY')) }
async function notion<T>(path: string, body?: unknown, method?: string): Promise<T> {
  const token = connectionSecret(await readIntegrationState(), 'notion', 'NOTION_API_KEY')
  if (!token) throw Error('notion_needs_setup')
  return providerJSON<T>('Notion', `https://api.notion.com/v1/${path}`, { method: method || (body ? 'POST' : 'GET'),
    headers: { Authorization: `Bearer ${token}`, 'Notion-Version': '2025-09-03', 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
}
export async function dealDataSource() {
  const database = process.env.NOTION_DEAL_DATABASE_ID
  if (!database || !/^[a-f0-9-]{32,36}$/i.test(database)) throw Error('notion_needs_setup')
  const db = await notion<{ data_sources: {id:string}[] }>(`databases/${database}`)
  const sourceId = process.env.NOTION_DEAL_DATA_SOURCE_ID || (db.data_sources?.length === 1 ? db.data_sources[0].id : '')
  if (!sourceId || !db.data_sources.some(s => s.id === sourceId)) throw Error('notion_data_source_ambiguous')
  const source = await notion<{ properties: Record<string,{type:string}> }>(`data_sources/${sourceId}`)
  const title = Object.entries(source.properties).find(([,p]) => p.type === 'title')?.[0]
  if (!title) throw Error('notion_title_missing')
  return { sourceId, title, properties: source.properties }
}
export async function fullDealPipeline() {
  const source = await dealDataSource(), pages: NotionPage[] = []
  let cursor: string | undefined
  do {
    const page = await notion<{results:NotionPage[];has_more:boolean;next_cursor:string|null}>(`data_sources/${source.sourceId}/query`, { page_size: 100, ...(cursor ? {start_cursor:cursor} : {}) })
    pages.push(...page.results)
    if (pages.length > 20_000) throw Error('pipeline_exceeds_limit')
    if (page.has_more && !page.next_cursor) throw Error('pipeline_incomplete')
    cursor = page.has_more ? page.next_cursor! : undefined
  } while (cursor)
  return { ...source, pages, complete: true as const }
}
export async function syncCompanyToNotion(companyId: string) {
  if (!await hasNotionDestination()) return { status: 'needs_setup' }
  const client = await getPool().connect()
  let locked = false
  try {
    locked = (await client.query('select pg_try_advisory_lock(hashtextextended($1,0)) locked', ['notion:' + companyId])).rows[0].locked
    if (!locked) return { status: 'processing' }
    const company = (await client.query('select * from vitamin_data.companies where id=$1', [companyId])).rows[0]
    if (!company) throw Error('company_missing')
    const source = await dealDataSource()
    let pageId = company.notion_page_id as string | null
    if (!pageId) {
      const existing = await notion<{results:NotionPage[]}>(`data_sources/${source.sourceId}/query`, { filter: { property: source.title, title: { equals: company.name } }, page_size: 2 })
      if (existing.results.length > 1) throw Error('notion_company_ambiguous')
      pageId = existing.results[0]?.id || null
    }
    if (!pageId) {
      const properties: Record<string, unknown> = { [source.title]: { title: [{ text: { content: company.name } }] } }
      const websiteField = Object.entries(source.properties).find(([name,p]) => p.type === 'url' && /website|url/i.test(name))?.[0]
      if (websiteField && company.website) properties[websiteField] = { url: company.website }
      const page = await notion<{id:string}>('pages', { parent: { type: 'data_source_id', data_source_id: source.sourceId }, properties,
        children: [{ object:'block', type:'paragraph', paragraph:{rich_text:[{type:'text',text:{content:[company.description,company.founder ? `Founder: ${company.founder}` : '',`Vitamin-C company reference: ${company.id}`].filter(Boolean).join('\n').slice(0,1900)}}]}}] })
      pageId = page.id
    }
    await client.query("update vitamin_data.companies set notion_page_id=$2,notion_status='syncing',updated_at=now() where id=$1", [companyId,pageId])
    const docs = (await client.query('select id,name,mime_type,data,notion_file_id from vitamin_data.documents where company_id=$1 and notion_file_id is null', [companyId])).rows
    // Reconcile existing child blocks before appending after an uncertain provider outcome.
    const existingCaptions = new Set<string>(); let cursor: string | undefined
    do {
      const children = await notion<{results:{type:string;file?:{caption?:{plain_text?:string;text?:{content:string}}[]}}[];has_more:boolean;next_cursor:string|null}>(`blocks/${pageId}/children?page_size=100${cursor?`&start_cursor=${encodeURIComponent(cursor)}`:''}`)
      for (const block of children.results) for (const caption of block.file?.caption || []) existingCaptions.add(caption.plain_text || caption.text?.content || '')
      cursor = children.has_more ? children.next_cursor || undefined : undefined
    } while(cursor)
    for (const doc of docs) {
      const marker = `Vitamin-C document ${doc.id}`
      if (existingCaptions.has(marker)) { await client.query("update vitamin_data.documents set notion_file_id='attached' where id=$1",[doc.id]); continue }
      const upload = await notion<{id:string}>('file_uploads', { mode:'single_part', filename:doc.name, content_type:doc.mime_type })
      const token = connectionSecret(await readIntegrationState(),'notion','NOTION_API_KEY'), form = new FormData()
      form.set('file',new Blob([new Uint8Array(doc.data)],{type:doc.mime_type}),doc.name)
      await providerJSON('Notion',`https://api.notion.com/v1/file_uploads/${upload.id}/send`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Notion-Version':'2025-09-03'},body:form})
      await notion(`blocks/${pageId}/children`,{children:[{object:'block',type:'file',file:{type:'file_upload',file_upload:{id:upload.id},name:doc.name,caption:[{type:'text',text:{content:marker}}]}}]},'PATCH')
      await client.query('update vitamin_data.documents set notion_file_id=$2 where id=$1',[doc.id,upload.id])
    }
    await client.query("update vitamin_data.companies set notion_status='synced',updated_at=now() where id=$1",[companyId])
    return { status:'synced',pageId }
  } catch {
    await client.query("update vitamin_data.companies set notion_status='needs_attention',updated_at=now() where id=$1",[companyId])
    return {status:'needs_attention'}
  } finally { if(locked)await client.query('select pg_advisory_unlock(hashtextextended($1,0))',['notion:'+companyId]);client.release() }
}
