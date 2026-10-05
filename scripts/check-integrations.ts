import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {mkdtemp,readFile,rm} from 'node:fs/promises'
import {screenEmail,screeningRules} from '../src/server/screening'
import {readIntegrationState,updateIntegrationState,decryptState} from '../src/server/integration-store'
import {validateSettings} from '../src/server/integrations'
import {mapPortfolio,financialRank,finiteNumber,safeExternalURL} from '../src/server/airtable'
import {notionId,readNotionDocuments} from '../src/server/notion'
import {portfolioCSV,reportedMoney} from '../src/components/portfolio-page'

const policy={mode:'off' as const,model:'gpt-6-luna',blockedSenders:['people@fund.example'],blockedLabels:['HR']}
const email={from:'founder@company.example',subject:'Update',body:'Revenue grew.'}
assert.equal(screeningRules({...email,from:'People <PEOPLE@fund.example>'},policy)?.decision,'exclude')
assert.equal(screeningRules({...email,from:'people@fund.example.attacker.invalid'},policy),undefined)
assert.equal(screeningRules({...email,body:'Our aggregate hiring budget funds three future roles. No individual compensation is included.'},policy),undefined)
assert.equal(screeningRules({...email,body:'Commercial progress. '.repeat(300)+'Final confidential individual employee payroll record.'},policy)?.decision,'exclude')
assert.equal(screeningRules({...email,attachments:[{name:'pitch-deck.pdf'}]},policy)?.decision,'review')
assert.equal(screeningRules({...email,body:'x'.repeat(100_001)},policy)?.decision,'review')
assert.equal((await screenEmail(email,policy,'')).decision,'review')
const response=(value:unknown,status='completed')=>({status,output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]})
const transport=async<T>(_provider:string,_url:string,init:RequestInit)=>{const body=JSON.parse(String(init.body));assert.equal(body.store,false);assert.equal(body.text.format.strict,true);return response({decision:'include',category:'investment',reason:'Private salary canary 874193'}) as T}
const safe=await screenEmail(email,policy,'synthetic',transport);assert.equal(safe.decision,'include');assert.ok(!safe.reason.includes('874193'))
for(const value of [{decision:'include',category:'hr',reason:'x'},{decision:'include',category:'unrelated',reason:'x'},{decision:'oops',category:'investment',reason:'x'}])assert.notEqual((await screenEmail(email,policy,'synthetic',async<T>()=>response(value) as T)).decision,'include')
assert.equal((await screenEmail(email,policy,'synthetic',async<T>()=>response({decision:'include',category:'investment',reason:'x'},'incomplete') as T)).decision,'review')
assert.equal((await screenEmail(email,policy,'synthetic',async()=>{throw Error('Provider failed')})).decision,'review')
assert.equal(finiteNumber(Infinity),null);assert.equal(finiteNumber({specialValue:'Infinity'}),null);assert.equal(finiteNumber(0),0)
const company={id:'company-1',createdTime:'',fields:{fldAEyjZZl3CVp2Vh:'Example',fldQngUXvChIpXJ74:{specialValue:'Infinity'},fldZfslyG5p2BxAqp:9}}
const report=(id:string,year:number,quarter:string,submitted:string,currency:string,revenue:number,companyId='company-1')=>({id,createdTime:'',fields:{fldYg3d3iS5aLBUlJ:[companyId],fldU78Q6SOsr3OUFD:year,fld2hylIBVf2TaPTv:quarter,fldtSkswhA28meVvf:submitted,fldlMeGwK0YUurQPA:currency,fld4nPs2Rjv0acnxY:revenue,fldiDYmBGrPv45c5Q:`${year} ${quarter}`}})
const older=report('old',2026,'Q1','2027-01-01','EUR',9999),latest=report('new',2026,'Q3','2026-10-01','USD',0),other=report('other',2027,'Q1','2027-01-02','EUR',1,'other-company')
assert.equal(mapPortfolio([{...company,fields:{...company.fields,fld9kwLHbUgKsOOBU:0}}],[])[0].moic,null)
assert.ok(financialRank(latest)>financialRank(older));const mapped=mapPortfolio([company],[older,latest,other])[0];assert.equal(mapped.revenueYTD,0);assert.equal(mapped.reportingCurrency,'USD');assert.equal(mapped.investedEUR,null);assert.ok(mapped.financialSourceUrl?.endsWith('/new'));assert.equal(mapped.ownershipPercent,9)
const csv=portfolioCSV([{...mapped,name:'=HYPERLINK("bad")',netCash:-50}]);assert.ok(csv.includes("'=HYPERLINK"));assert.ok(csv.includes('"-50"'));assert.ok(!csv.includes("'-50"));assert.ok(csv.includes('"USD"'));assert.equal(reportedMoney(null,'USD'),'—');assert.match(reportedMoney(0,'USD'),/0/)
assert.equal(safeExternalURL('javascript:alert(1)'),undefined);assert.equal(safeExternalURL('https://user:secret@example.invalid'),undefined)
assert.throws(()=>notionId('https://attacker.invalid/0123456789abcdef0123456789abcdef'));assert.equal(notionId('https://www.notion.so/Title-0123456789abcdef0123456789abcdef'),'0123456789abcdef0123456789abcdef')
const originalFetch=globalThis.fetch,root='0123456789abcdef0123456789abcdef',child='1123456789abcdef0123456789abcdef';let blockPages=0
try {
 globalThis.fetch=async(input,init)=>{const url=String(input);assert.ok(url.startsWith('https://api.notion.com/v1/'));assert.equal(new Headers(init?.headers).get('Notion-Version'),'2025-09-03');if(url.endsWith('/pages/'+root))return Response.json({properties:{Title:{type:'title',title:[{plain_text:'Investment thesis'}]}},last_edited_time:'2026-10-01',url:'https://notion.so/'+root});if(url.includes('/blocks/'+root+'/children')){blockPages++;return Response.json(blockPages===1?{results:[{id:child,type:'paragraph',paragraph:{rich_text:[{plain_text:'First page of content.'}]}}],has_more:true,next_cursor:'second'}:{results:[{id:child,type:'paragraph',paragraph:{rich_text:[{plain_text:'Final page of content.'}]}}],has_more:false})}throw Error('Unexpected request')}
 const documents=await readNotionDocuments('synthetic',[{id:root,object:'page'}]);assert.equal(blockPages,2);assert.ok(documents[0].text.includes('Final page of content.'))
 globalThis.fetch=async()=>Response.json({error:'Forbidden'},{status:403});await assert.rejects(readNotionDocuments('synthetic',[{id:root,object:'page'}]),/refused/)
}finally{globalThis.fetch=originalFetch}
const dir=await mkdtemp('/private/tmp/vitaminc-integration-qa-'),oldDir=process.env.INTEGRATION_STATE_DIRECTORY,oldKey=process.env.CONNECTOR_ENCRYPTION_KEY
const oldAuth=process.env.BETTER_AUTH_SECRET;process.env.BETTER_AUTH_SECRET=randomBytes(32).toString('hex')
const oldURL=process.env.BETTER_AUTH_URL;process.env.BETTER_AUTH_URL='http://127.0.0.1:3000'
process.env.INTEGRATION_STATE_DIRECTORY=dir;process.env.CONNECTOR_ENCRYPTION_KEY=randomBytes(32).toString('hex')
try{
 const state=await readIntegrationState();assert.equal(state.settings.screening.mode,'off');assert.throws(()=>validateSettings({...state.settings,screening:{...state.settings.screening,mode:'on'}}),/remain off/)
 await Promise.all(Array.from({length:12},(_,i)=>updateIntegrationState(state=>{state.credentials['fixture-'+i]='secret-canary-'+i})))
 const saved=await readIntegrationState();assert.equal(Object.keys(saved.credentials).length,12)
 const raw=await readFile(dir+'/integrations.enc','utf8');assert.ok(!raw.includes('secret-canary'));const tampered=JSON.parse(raw);tampered.tag='00'.repeat(16);assert.throws(()=>decryptState(JSON.stringify(tampered)))
}finally{if(oldDir===undefined)delete process.env.INTEGRATION_STATE_DIRECTORY;else process.env.INTEGRATION_STATE_DIRECTORY=oldDir;if(oldKey===undefined)delete process.env.CONNECTOR_ENCRYPTION_KEY;else process.env.CONNECTOR_ENCRYPTION_KEY=oldKey;if(oldAuth===undefined)delete process.env.BETTER_AUTH_SECRET;else process.env.BETTER_AUTH_SECRET=oldAuth;if(oldURL===undefined)delete process.env.BETTER_AUTH_URL;else process.env.BETTER_AUTH_URL=oldURL;await rm(dir,{recursive:true})}
console.log('Integration checks passed: fail-closed screening, no private detail echo, enforcement lock, reporting period/currency/null mapping, scoped Notion reads/pagination, encrypted serialized storage and tamper rejection.')
