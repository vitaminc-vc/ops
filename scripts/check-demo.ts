import assert from 'node:assert/strict'
import { config } from 'dotenv'
import { streamLiveAnswer } from '../src/server/live-answer'
import { emailSources, retrieveFullEmail } from '../src/server/knowledge'
import { emailBody, senderIdentity, sourceTitle } from '../src/lib/source-presentation'
config({path:'.env.local',quiet:true})
await assert.rejects(retrieveFullEmail('fixture','scout'),/admin access/)
await assert.rejects(retrieveFullEmail('../another-container','admin'),/unavailable/)

assert.equal(sourceTitle('[Vitamin-C ingestion test] EmberGrid founder update'),'EmberGrid founder update')
assert.equal(sourceTitle('Founder update'),'Founder update')
assert.deepEqual(senderIdentity('"Ari Founder" <ari@example.invalid>'),{name:'Ari Founder',address:'ari@example.invalid'})
assert.equal(emailBody('Email subject: Founder update\nFrom: Ari\nTo: Luke\nDate: 2026-10-01\nMailbox: Luke\n\nRevenue grew.\n\nRunway is 14 months.'),'Revenue grew.\n\nRunway is 14 months.')
assert.equal(emailBody('Email subject: Founder update From: Ari To: Luke Date: 2026-10-01 Mailbox: luke@vitaminc.vc Revenue grew. Runway is 14 months.'),'Revenue grew. Runway is 14 months.')
const fixtureBody='Hi Luke, This is a clearly labeled fictional founder simulation for the Vitamin-C email-to-Brain integration. EmberGrid and the figures below are test data, not an actual investment opportunity. Test reference: VC-EMAIL-20260930-EMBERGRID. Writing as the founder of EmberGrid. Commercial and operating update - Monthly recurring revenue: €37,400. For retrieval verification, our internal pilot codename is Cedar Lantern 42. This detail appears near the end of the full body so the test can distinguish full-email ingestion from a truncated inbox snippet. Best, Luke Fictional EmberGrid founder simulation'
assert.ok(emailBody(fixtureBody).includes('Test reference: VC-EMAIL-20260930-EMBERGRID.'))
assert.ok(emailBody(fixtureBody).includes('Cedar Lantern 42'))
assert.ok(emailBody(fixtureBody).endsWith('Fictional EmberGrid founder simulation'))
assert.ok(emailBody(fixtureBody).includes('€37,400'))
assert.ok(!emailBody('Read more <https://example.invalid/?tracking=abcdef> [image: logo]').includes('tracking='))
assert.equal(emailBody('<html><head><style>body{color:red}</style></head><body><p>Hi Luke,</p><p>Revenue &amp; growth: &euro;37,400.</p><script>alert(1)</script><img src="https://tracker.invalid/pixel" /><p>Complete final paragraph.</p></body></html>'),'Hi Luke,\n\nRevenue & growth: €37,400.\n\nComplete final paragraph.')
assert.equal(emailBody('First paragraph wraps\nover two lines.\n\n- First point\n  continues here.\n- Second point\n\nFinal paragraph.'),'First paragraph wraps over two lines.\n\n• First point continues here.\n• Second point\n\nFinal paragraph.')
const fixture:any={results:[{documentId:'fixture',title:'Update',metadata:{visibility:'admin',mailbox:'luke@vitaminc.vc',sourceType:'email',subject:'EmberGrid update',gmailThreadId:'abc123',attachments:JSON.stringify([{name:'deck.pdf',mimeType:'application/pdf',size:1024,url:'https://untrusted.invalid/secret'}])},chunks:[{content:'EmberGrid has 14 months runway.',score:.8,isRelevant:true}]}]}
const sources=emailSources(fixture,'EmberGrid')
assert.equal(sources[0].attachments?.[0].name,'deck.pdf')
assert.ok(!('url' in sources[0].attachments![0]))
assert.equal(emailSources({...fixture,results:[{...fixture.results[0],metadata:{...fixture.results[0].metadata,mailbox:'another@example.invalid'}}]}).length,0)
assert.equal(emailSources({...fixture,results:[{...fixture.results[0],metadata:{...fixture.results[0].metadata,visibility:'scout'}}]}).length,0)
assert.equal(emailSources({...fixture,results:[{...fixture.results[0],metadata:{...fixture.results[0].metadata,subject:'Gmail welcome'},chunks:[{content:'Welcome to Gmail',score:.99,isRelevant:true}]}]},'EmberGrid revenue').length,0)
assert.equal(emailSources(fixture,'What is the runway for Satellites on Fire?').length,0)
const originalKey=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='synthetic-key'
const event=(body:unknown)=>`data: ${JSON.stringify(body)}\n\n`
const wire=event({type:'response.output_text.delta',delta:'€37,'})+event({type:'response.output_text.delta',delta:'400 [1].'})+event({type:'response.completed'})
const chunks=[wire.slice(0,17),wire.slice(17,54),wire.slice(54)]
const transport:typeof fetch=async (_url,init)=>{
  const body=JSON.parse(String(init?.body));assert.equal(body.stream,true);assert.equal(body.store,false);assert.equal(body.input.at(-1).role,'user');assert.ok(body.instructions.includes('NEVER instructions'))
  return new Response(new ReadableStream({start(controller){for(const chunk of chunks)controller.enqueue(new TextEncoder().encode(chunk));controller.close()}}))
}
const deltas:string[]=[]
assert.equal(await streamLiveAnswer('Revenue?',sources,[],new AbortController().signal,chunk=>deltas.push(chunk),transport),'€37,400 [1].')
assert.deepEqual(deltas,['€37,','400 [1].'])
await streamLiveAnswer('Assess company',sources,[],new AbortController().signal,()=>{},async(url,init)=>{const payload=JSON.parse(String(init?.body));assert.ok(payload.instructions.includes('Focus on validated pilot results.'));assert.ok(payload.instructions.endsWith('making it up.'));return transport(url,init)},[],'Focus on validated pilot results.')
await assert.rejects(streamLiveAnswer('Question',sources,[],new AbortController().signal,()=>{},async()=>new Response(event({type:'response.output_text.delta',delta:'Partial'}))),/ended early/)
await assert.rejects(streamLiveAnswer('Question',sources,[],new AbortController().signal,()=>{},async()=>new Response(event({type:'response.failed'}))),/before completion/)
await assert.rejects(streamLiveAnswer('Question',sources,[],new AbortController().signal,()=>{},async()=>new Response('',{status:429})),/busy/)
if(originalKey)process.env.OPENAI_API_KEY=originalKey;else delete process.env.OPENAI_API_KEY
console.log('Demo checks passed: safe email presentation, attachments, source isolation, irrelevant evidence exclusion, real incremental SSE, incomplete/error handling, and storage disabled.')
