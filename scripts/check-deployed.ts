import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { config } from 'dotenv'
import { zipSync, strToU8 } from 'fflate'
import { getPool } from '../src/server/db'
import { emailKnowledgeClient, retrieveEmailSources } from '../src/server/knowledge'

config({path:'.env.local',quiet:true})
const base=process.env.QA_BASE_URL || 'https://vitamin-c-platform-production.up.railway.app'
const qa=JSON.parse(await readFile('.private/demo-qa.json','utf8'))
assert.match(qa.email,/^vitamin-c-demo-qa-[a-f0-9-]+@example\.invalid$/)
const pool=getPool(),messageId='fab'+randomBytes(8).toString('hex'),id='vitaminc_luke_gmail_'+messageId
const companyName='QAVerdant'+randomBytes(5).toString('hex')
const companyWebsite=`https://${companyName.toLowerCase()}.example.invalid`
const deckText=`${companyName} founder pitch. Our climate venture makes heat pumps for small farms. Our verified pilot metric is 47219 units of heat saved. Website ${companyWebsite}.`
const bytes=zipSync({'ppt/slides/slide1.xml':strToU8(`<a:p><a:t>${deckText}</a:t></a:p>`),'ppt/notesSlides/notesSlide1.xml':strToU8('<a:p><a:t>Board presentation note: the deployment codename is Juniper Lighthouse.</a:t></a:p>')})
let memoryId:string|undefined,companyId:string|undefined
try {
  const login=await fetch(base+'/api/auth/sign-in/email',{method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify({email:qa.email,password:qa.password})})
  assert.equal(login.status,200,'Existing Better Auth account must sign in to production')
  const cookie=login.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ')
  assert.match(cookie,/__Secure-vitamin-c/)
  const auth=async(path:string)=>{const r=await fetch(base+path,{headers:{cookie}});assert.equal(r.status,200,path);return r.json()}
  const overview=await auth('/api/integrations');assert.equal(overview.settings.screening.mode,'enforced')
  const portfolio=await auth('/api/portfolio');assert.equal(portfolio.source,'Airtable');assert.ok(portfolio.companies.some((c:{name:string})=>c.name==='Satellites on Fire'))
  const agents=await auth('/api/agent-runs');assert.equal(agents.lp.records.length,405,'Live LP snapshot must be present')
  console.log('Production login, protected integrations, enforced policy, Airtable portfolio and imported agent context verified.')
  const email={mailbox:'luke@vitaminc.vc',messageId,threadId:messageId,from:`founder@${companyName.toLowerCase()}.example.invalid`,to:'luke@vitaminc.vc',subject:`${companyName} synthetic integration fixture`,body:`I am the founder of ${companyName}. Please review our attached pitch deck. This is a synthetic QA company. Website: ${companyWebsite}`,receivedAt:new Date().toISOString(),labels:[],attachments:[{name:'pitch.pptx',mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation',data:Buffer.from(bytes).toString('base64')}]}
  const headers={authorization:`Bearer ${process.env.INGESTION_API_KEY}`,'content-type':'application/json'}
  const r=await fetch(base+'/api/ingest/email',{method:'POST',headers,body:JSON.stringify(email)});assert.equal(r.status,200)
  let receipt=await r.json();assert.ok(['indexed','indexing'].includes(receipt.status),JSON.stringify(receipt));companyId=receipt.companyId;assert.ok(companyId);assert.equal(receipt.notion,'needs_setup')
  console.log('Synthetic deck accepted and company saved; waiting for Brain indexing.')
  for(let i=0;receipt.status==='indexing'&&i<40;i++){
    await new Promise(resolve=>setTimeout(resolve,3000));const check=await fetch(base+'/api/ingest/email?id='+encodeURIComponent(id),{headers});receipt=await check.json()
  }
  assert.equal(receipt.status,'indexed')
  const row=(await pool.query('select memory_id,company_id from vitamin_data.ingestions where id=$1',[id])).rows[0];memoryId=row.memory_id;companyId=row.company_id
  const documents=(await pool.query('select id,content,data from vitamin_data.documents where ingestion_id=$1',[id])).rows;assert.equal(documents.length,1);assert.match(documents[0].content,/Juniper Lighthouse/)
  const download=await fetch(base+'/api/documents/'+documents[0].id,{headers:{cookie}});assert.equal(download.status,200);assert.deepEqual(Buffer.from(await download.arrayBuffer()),Buffer.from(bytes))
  const duplicate=await fetch(base+'/api/ingest/email',{method:'POST',headers,body:JSON.stringify(email)});assert.equal((await duplicate.json()).duplicate,true)
  const found=await retrieveEmailSources(`${companyName} Juniper Lighthouse 47219`,'admin');assert.ok(found.some(s=>s.id===id||s.id===memoryId),'The indexed attachment must be retrievable through the Brain source layer')
  const page=await auth('/api/companies');assert.ok(page.companies.some((c:{id:string})=>c.id===companyId));assert.ok(page.documents.some((d:{id:string})=>d.id===documents[0].id))
  console.log('Live attachment path passed: PPTX + notes, company record, private file download, Brain indexing/retrieval, retry deduplication, and honest Notion setup status.')
} finally {
  const row=(await pool.query('select memory_id,company_id from vitamin_data.ingestions where id=$1',[id])).rows[0]
  memoryId ||= row?.memory_id;companyId ||= row?.company_id
  if(memoryId)await emailKnowledgeClient().documents.delete(memoryId)
  await pool.query('delete from vitamin_data.ingestions where id=$1',[id])
  if(companyId)await pool.query("delete from vitamin_data.companies where id=$1 and source='gmail' and source_id=$2",[companyId,id])
  await pool.end()
  console.log('Only the synthetic integration fixture was removed.')
}
