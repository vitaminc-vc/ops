import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { config } from 'dotenv'
import { getPool } from '../src/server/db'
config({path:'.env.local',quiet:true})
const base=process.env.QA_BASE_URL||'http://127.0.0.1:3002',origin='https://vitamin-c-platform-production.up.railway.app'
const messageId='fab'+randomBytes(8).toString('hex'),id='vitaminc_luke_gmail_'+messageId
const stream='BT /F1 12 Tf 30 700 Td (Confidential individual employee payroll record. Synthetic QA fixture.) Tj ET'
const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`]
let pdf='%PDF-1.4\n',offsets=[0]
objects.forEach((object,index)=>{offsets.push(Buffer.byteLength(pdf));pdf+=`${index+1} 0 obj\n${object}\nendobj\n`})
const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
await writeFile('/private/tmp/vitaminc-qa-hr.pdf',pdf)
const pool=getPool()
try{
  assert.equal((await fetch(base+'/api/health')).status,200)
  for(const path of ['/api/companies','/api/agent-runs','/api/mailboxes','/api/integrations','/api/ingest/email'])assert.equal((await fetch(base+path)).status,401)
  const signup=await fetch(base+'/api/auth/sign-up/email',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({email:'not-created@example.invalid',name:'QA',password:'Never-created-password-123'})});assert.ok([400,403,404].includes(signup.status))
  const token=await fetch(base+'/api/auth/get-access-token',{method:'POST',headers:{origin,'content-type':'application/json'},body:'{}'});assert.equal(token.status,403)
  const body={mailbox:'luke@vitaminc.vc',messageId,threadId:messageId,from:'founder@example.invalid',to:'luke@vitaminc.vc',subject:'Synthetic screening fixture',body:'Please inspect the attached document for this synthetic test.',receivedAt:new Date().toISOString(),labels:[],attachments:[{name:'fixture.pdf',mimeType:'application/pdf',data:Buffer.from(pdf).toString('base64')}]}
  const r=await fetch(base+'/api/ingest/email',{method:'POST',headers:{authorization:`Bearer ${process.env.INGESTION_API_KEY}`,'content-type':'application/json'},body:JSON.stringify(body)})
  assert.equal(r.status,200);const receipt=await r.json();assert.equal(receipt.status,'excluded','Production PDF extraction must expose HR text to screening.');assert.equal(receipt.terminal,true)
  const row=(await pool.query('select content,decision from vitamin_data.ingestions where id=$1',[id])).rows[0];assert.equal(row.content,null);assert.equal(row.decision,'exclude')
  assert.equal((await pool.query('select count(*)::int n from vitamin_data.documents where ingestion_id=$1',[id])).rows[0].n,0)
  console.log('Production bundle verified: database health, protected APIs, external-domain signup rejected, provider tokens server-only, PDF parsed and HR rejected before content/file storage.')
}finally{await pool.query('delete from vitamin_data.ingestions where id=$1',[id]);await pool.end()}
