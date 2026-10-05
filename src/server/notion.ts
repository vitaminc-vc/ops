import { providerJSON } from './provider-http'
import type { SourceDocument } from './integration-store'
type RichText = { plain_text?: string; text?: { content?: string } }
type Block = { id:string; type:string; has_children?:boolean; [key:string]:unknown }
const text = (v: unknown):string => Array.isArray(v) ? (v as RichText[]).map(x=>x.plain_text || x.text?.content || '').join('') : ''
export function notionId(value:string) {
  const raw=value.trim(); let candidate=raw
  if(raw.startsWith('https://')) { const u=new URL(raw); if(u.hostname!=='notion.so' && u.hostname!=='www.notion.so' && !u.hostname.endsWith('.notion.site')) throw Error('Use a Notion page URL or ID.'); candidate=u.pathname.split('/').pop() || '' }
  const id=candidate.match(/([a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i)?.[1]
  if(!id) throw Error('Enter a valid Notion page or database ID.'); return id.replaceAll('-','')
}
const request = <T>(token:string,path:string,body?:unknown) => providerJSON<T>('Notion',`https://api.notion.com/v1/${path}`,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${token}`,'Notion-Version':'2025-09-03','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})})
export async function listNotionPages(token:string) {
  const rows: {id:string;title:string;url:string;object:string}[]=[];let cursor:string|undefined
  do { const result=await request<{results:any[];has_more:boolean;next_cursor?:string}>(token,'search',{page_size:100,...(cursor?{start_cursor:cursor}:{})}); for(const r of result.results) rows.push({id:r.id,title:text(r.title || Object.values(r.properties||{}).find((p:any)=>p.type==='title') && (Object.values(r.properties) as any[]).find(p=>p.type==='title').title) || 'Untitled',url:r.url || `https://www.notion.so/${r.id.replaceAll('-','')}`,object:r.object});cursor=result.has_more?result.next_cursor:undefined; if(rows.length>1000)throw Error('Too many shared Notion resources. Narrow the integration access.');if(cursor)await new Promise(r=>setTimeout(r,350));}while(cursor)
  return rows
}
export async function readNotionDocuments(token:string,roots:{id:string;object:string}[]):Promise<SourceDocument[]> {
  const documents:SourceDocument[]=[]; const seen=new Set<string>();let calls=0
  const get=<T>(path:string,body?:unknown)=>{if(++calls>120)throw Error('Notion sync needs a smaller selected scope. No partial snapshot was saved.');return request<T>(token,path,body)}
  async function readBlocks(id:string,depth=0):Promise<string[]> {
    if(depth>12)throw Error('Notion nesting exceeds the import limit.')
    const lines:string[]=[];let cursor:string|undefined
    do {const page=await get<{results:Block[];has_more:boolean;next_cursor?:string}>(`blocks/${id}/children?page_size=100${cursor?`&start_cursor=${encodeURIComponent(cursor)}`:''}`)
      for(const block of page.results){const payload=block[block.type] as Record<string,unknown> || {};const value=text(payload.rich_text || payload.caption);if(value)lines.push(value);if(block.type==='child_page')await readPage(block.id);else if(block.type==='child_database')await readDatabase(block.id);else if(block.has_children)lines.push(...await readBlocks(block.id,depth+1));if(block.type==='table_row')for(const cell of (payload.cells as unknown[]||[]))lines.push(text(cell));}
      cursor=page.has_more?page.next_cursor:undefined;await new Promise(r=>setTimeout(r,350))
    }while(cursor);return lines
  }
  async function readPage(id:string){id=notionId(id);if(seen.has(id))return;seen.add(id);if(seen.size>100)throw Error('Select fewer Notion pages for this sync.');const page=await get<any>(`pages/${id}`);if(page.archived||page.in_trash)return;const title=text((Object.values(page.properties||{}) as any[]).find(p=>p.type==='title')?.title)||'Untitled';const properties=Object.entries(page.properties||{}).map(([name,p]:[string,any])=>{const value=p[p.type];return `${name}: ${typeof value==='string'||typeof value==='number'?value:Array.isArray(value)?text(value):value?.name||''}`}).filter(v=>!v.endsWith(': '));const content=(await readBlocks(id)).join('\n');documents.push({id:`notion_${id}`,title,text:[title,...properties,content].join('\n\n'),sourceUrl:page.url||`https://www.notion.so/${id}`,updatedAt:page.last_edited_time,connectionId:'notion'})}
  async function readDataSource(id:string){let cursor:string|undefined;do{const page=await get<any>(`data_sources/${notionId(id)}/query`,{page_size:100,...(cursor?{start_cursor:cursor}:{})});for(const item of page.results)await readPage(item.id);cursor=page.has_more?page.next_cursor:undefined;}while(cursor)}
  async function readDatabase(id:string){const db=await get<any>(`databases/${notionId(id)}`);for(const ds of db.data_sources||[])await readDataSource(ds.id)}
  for(const root of roots){if(root.object==='page')await readPage(root.id);else if(root.object==='data_source')await readDataSource(root.id);else if(root.object==='database')await readDatabase(root.id);else throw Error('Choose a supported Notion page or database.')}
  return documents
}
