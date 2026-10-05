import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const w=JSON.parse(readFileSync(process.argv[2]||'integrations/n8n/vitaminc-screened-email.json','utf8'))
const node=name=>{const matches=w.nodes.filter(n=>n.name===name);assert.equal(matches.length,1);return matches[0]}
assert.equal(new Set(w.nodes.map(n=>n.name)).size,w.nodes.length)
assert.equal(w.settings.executionOrder,'v1')
assert.equal(w.settings.saveDataErrorExecution,'none');assert.equal(w.settings.saveDataSuccessExecution,'none')
assert.equal(w.settings.saveManualExecutions,false);assert.equal(w.settings.saveExecutionProgress,false)
assert.ok(!Object.keys(w.pinData||{}).length)
for(const n of w.nodes.filter(n=>n.type==='n8n-nodes-base.httpRequest'))assert.ok(n.parameters.url.includes('vitamin-c-platform-production.up.railway.app/api/ingest/'))
assert.equal(node('Read full thread messages').parameters.options.downloadAttachments,true)
assert.equal(node('Read full thread messages').parameters.simple,false)
assert.equal(node('Load full threads').parameters.options.returnOnlyMessages,false)
for(const name of ['Gmail message received','Unindexed inbound email'])for(const label of ['indexed','excluded','review'])assert.ok(node(name).parameters.filters.q.includes('-label:vitamin-c-brain-'+label))
assert.equal(w.nodes.filter(n=>n.type==='n8n-nodes-base.scheduleTrigger').length,1)

const email=(id,threadId,text,labels=['INBOX'])=>({json:{id,threadId,text,date:'2026-10-05T00:00:00Z',subject:'Synthetic company update',from:{text:'Founder <founder@example.invalid>'},to:{text:'luke@vitaminc.vc'},labelIds:labels}})
const a=email('abc1','aa','Recent founder update.'),b=email('abc2','aa','Old thread message with individual employee payroll.',['SENT']),c=email('def1','dd','Other company update.')
b.binary={attachment_0:{fileName:'deck.txt',mimeType:'text/plain'}}
const items=[a,b,c],originals=[a,c]
const binary=Buffer.from('Full slide contents. Synthetic investment information.')
const helper={helpers:{getBinaryDataBuffer:async(index,key)=>{assert.equal(index,1);assert.equal(key,'attachment_0');return binary}}}
const prepare=new (async function(){}).constructor('$input','$',node('Prepare screened email').parameters.jsCode)
const result=await prepare.call(helper,{all:()=>items},name=>{assert.equal(name,'Unindexed inbound email');return{all:()=>originals}})
assert.equal(result.length,2);assert.equal(result[0].json.messageId,'abc1');assert.equal(result[1].json.messageId,'def1')
assert.match(result[0].json.body,/individual employee payroll/);assert.ok(!result[1].json.body.includes('payroll'))
assert.equal(result[0].json.attachments.length,1);assert.equal(result[1].json.attachments.length,0)
assert.equal(result[0].json.attachments[0].data,binary.toString('base64'))
await assert.rejects(prepare.call(helper,{all:()=>[a]},()=>({all:()=>[c]})),/Complete thread/)
await assert.rejects(prepare.call(helper,{all:()=>[{json:{...a.json,text:'',snippet:'A truncated snippet'}}]},()=>({all:()=>[a]})),/Full message text/)
const validation=new Function('$json','$runIndex',node('Validate processing').parameters.jsCode)
assert.throws(()=>validation({status:'failed'},0),/failed/);assert.throws(()=>validation({status:'indexing',terminal:false},19),/pending/)
for(const status of ['indexed','excluded','review']){
 const receipt=new Function('$json','$',node('Processing receipt').parameters.jsCode)({status},name=>name==='Processing labels'?{first:()=>({json:{labels:{}}})}:{item:{json:name==='Prepare screened email'?result[0].json:{id:'receipt'}}})
 assert.equal(receipt.json.labelName,'vitamin-c-brain-'+status);assert.equal(receipt.json.gmailMessageId,'abc1')
}
if(node('Gmail message received').credentials){
 assert.equal(new Set(w.nodes.filter(n=>['n8n-nodes-base.gmail','n8n-nodes-base.gmailTrigger'].includes(n.type)).map(n=>n.credentials?.gmailOAuth2?.id)).size,1)
 for(const n of w.nodes.filter(n=>n.type==='n8n-nodes-base.httpRequest'))assert.equal(n.credentials.httpBearerAuth.name,'Vitamin-C screened ingestion')
}
console.log('Screened workflow checks passed: complete thread isolation, binary attachment extraction, missing-content rejection, separate processing labels, bounded indexing waits, fixed service host, and no saved execution payloads.')
