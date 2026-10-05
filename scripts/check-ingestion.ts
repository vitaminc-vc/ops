import assert from 'node:assert/strict'
import { randomBytes, createHash } from 'node:crypto'
import { config } from 'dotenv'
import { zipSync, strToU8 } from 'fflate'
import { parseAttachment } from '../src/server/attachments'
import { validateInbound, ingestEmail, ingestionId } from '../src/server/ingestion'
import { requireIngestionService } from '../src/server/service-access'
import { getPool } from '../src/server/db'
import { companyIdentity } from '../src/server/company-records'

config({path:'.env.local',quiet:true})
const run=randomBytes(6).toString('hex'),prefix='fa'+run
const text='Fixture company builds industrial thermal storage. Annual revenue is 120000 EUR. This is synthetic QA content.'
const plain={name:'deck.txt',mimeType:'text/plain',data:Buffer.from(text).toString('base64')}
assert.match((await parseAttachment(plain)).text,/thermal storage/)
const ppt=zipSync({'ppt/slides/slide1.xml':strToU8(`<p:sld><a:p><a:t>${text}</a:t></a:p></p:sld>`),'ppt/notesSlides/notesSlide1.xml':strToU8('<a:p><a:t>Notes contain confidential individual employee payroll.</a:t></a:p>')})
const parsed=await parseAttachment({name:'deck.pptx',mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation',data:Buffer.from(ppt).toString('base64')})
assert.match(parsed.text,/individual employee payroll/)
await assert.rejects(parseAttachment({name:'unknown.bin',mimeType:'application/octet-stream',data:'AAAA'}))
assert.equal(companyIdentity({name:'Example',website:'https://www.example.test/about',founder:null,description:null}).identityKey,'domain:example.test')
assert.equal(companyIdentity({name:' Example ',website:null,founder:null,description:null}).identityKey,companyIdentity({name:'example',website:null,founder:null,description:null}).identityKey)
const oldKey=process.env.INGESTION_API_KEY;process.env.INGESTION_API_KEY='a'.repeat(64)
assert.equal(requireIngestionService(new Request('https://example.test',{headers:{authorization:'Bearer '+'a'.repeat(64)}})),true)
assert.equal(requireIngestionService(new Request('https://example.test',{headers:{authorization:'Bearer '+'é'.repeat(64)}})),false)
process.env.INGESTION_API_KEY=oldKey
const originalFetch=globalThis.fetch,oldNotion=process.env.NOTION_DEAL_DATABASE_ID
delete process.env.NOTION_DEAL_DATABASE_ID
let memoryWrites=0,modelCalls=0,modelFails=false,memoryFails=false,lastContent=''
const model=(value:unknown)=>Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]})
globalThis.fetch=async(input,init)=>{
  const url=String(input)
  if(url==='https://api.openai.com/v1/responses'){
    modelCalls++;if(modelFails)throw Error('synthetic model failure')
    const body=JSON.parse(String(init?.body));assert.equal(body.store,false)
    return model(body.text.format.name==='company'?{company:{name:'QA '+run,website:`https://${run}.example.invalid`,founder:'Synthetic Founder',description:'Synthetic thermal storage fixture.'}}:{decision:'include',category:'investment',reason:'Business pitch.'})
  }
  if(url==='https://api.supermemory.ai/v3/documents'&&init?.method==='POST'){
    memoryWrites++;if(memoryFails)return Response.json({error:'synthetic'}, {status:503})
    const body=JSON.parse(String(init.body));assert.equal(body.containerTag,'vitaminc_email_admin');lastContent=body.content;return Response.json({id:body.customId})
  }
  if(url.startsWith('https://api.supermemory.ai/v3/documents/'))return Response.json({id:url.split('/').at(-1),status:'done'})
  throw Error('Unexpected external request: '+url)
}
const pool=getPool(),ids:string[]=[]
const fixture=(suffix:string,extra:Record<string,unknown>={})=>{const email=validateInbound({mailbox:'luke@vitaminc.vc',messageId:prefix+suffix,threadId:prefix+suffix,from:'founder@example.invalid',to:'luke@vitaminc.vc',subject:'Synthetic QA '+run,body:text,receivedAt:new Date().toISOString(),labels:[],attachments:[plain],...extra});ids.push(ingestionId(email.mailbox,email.messageId));return email}
try{
  const safe=fixture('01'),result=await ingestEmail(safe);assert.equal(result.status,'indexed');assert.match(lastContent,/Attachment: deck.txt/)
  const again=await ingestEmail(safe);assert.equal(again.duplicate,true);assert.equal(memoryWrites,1)
  const row=(await pool.query('select content,company_id,decision from vitamin_data.ingestions where id=$1',[ids[0]])).rows[0];assert.equal(row.decision,'include');assert.ok(row.company_id)
  assert.equal((await pool.query('select count(*)::int n from vitamin_data.documents where ingestion_id=$1',[ids[0]])).rows[0].n,1)
  await ingestEmail(fixture('02'));assert.equal((await pool.query('select count(*)::int n from vitamin_data.companies where identity_key=$1',['domain:'+run+'.example.invalid'])).rows[0].n,1)
  const priorWrites=memoryWrites,priorCalls=modelCalls
  assert.equal((await ingestEmail(fixture('03',{body:text+' Confidential individual employee payroll.',attachments:[]}))).status,'excluded')
  assert.equal((await ingestEmail(fixture('04',{attachments:[{name:'deck.pptx',mimeType:parsed.mimeType,data:parsed.data}]}))).status,'excluded')
  assert.equal(memoryWrites,priorWrites);assert.equal(modelCalls,priorCalls)
  assert.equal((await ingestEmail(fixture('05',{attachments:[{name:'unreadable.pdf',mimeType:'application/pdf',data:'AAAA'}]}))).status,'review')
  modelFails=true;assert.equal((await ingestEmail(fixture('06'))).status,'review');modelFails=false
  assert.equal(memoryWrites,priorWrites)
  for(const id of ids.slice(2)){const item=(await pool.query('select content from vitamin_data.ingestions where id=$1',[id])).rows[0];assert.equal(item.content,null);assert.equal((await pool.query('select count(*)::int n from vitamin_data.documents where ingestion_id=$1',[id])).rows[0].n,0)}
  memoryFails=true;const retry=fixture('07');await assert.rejects(ingestEmail(retry));assert.equal((await pool.query('select status from vitamin_data.ingestions where id=$1',[ids.at(-1)])).rows[0].status,'failed');memoryFails=false
  assert.equal((await ingestEmail(retry)).status,'indexed')
  memoryFails=true;const changed=fixture('09');await assert.rejects(ingestEmail(changed));memoryFails=false
  assert.equal((await ingestEmail({...changed,body:'Confidential individual employee payroll.',attachments:[]})).status,'excluded')
  assert.equal((await pool.query('select count(*)::int n from vitamin_data.documents where ingestion_id=$1',[ingestionId(changed.mailbox,changed.messageId)])).rows[0].n,0)
  await assert.rejects(ingestEmail(fixture('08',{mailbox:'different@vitaminc.vc'})),/not_authorized/)
  const denied=await pool.query("select has_schema_privilege('anon','vitamin_data','usage') anon,has_schema_privilege('authenticated','vitamin_data','usage') authenticated");assert.deepEqual(denied.rows[0],{anon:false,authenticated:false})
  console.log('Ingestion QA passed: Office notes screened, accepted files stored, company dedupe, idempotency, HR exclusion before writes, unreadable/model failure holds, retry recovery, mailbox isolation, and private schema access.')
}finally{
  globalThis.fetch=originalFetch;if(oldNotion)process.env.NOTION_DEAL_DATABASE_ID=oldNotion
  await pool.query('delete from vitamin_data.ingestions where id=any($1::text[])',[ids])
  await pool.query('delete from vitamin_data.companies where identity_key=$1',['domain:'+run+'.example.invalid'])
  assert.equal((await pool.query('select count(*)::int n from vitamin_data.ingestions where id=any($1::text[])',[ids])).rows[0].n,0)
  await pool.end()
}
