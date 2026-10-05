import { createFileRoute } from '@tanstack/react-router'
import type { ChatEvent } from '@/lib/chat-types'
import { getWorkspaceUser } from '@/server/auth'
import { authEnvironment } from '@/server/env'
import { canUseLP, isLPRequest } from '@/lib/access'
import { hasEmailKnowledge, queryEntities } from '@/server/knowledge'
import { retrieveWorkspaceSources } from '@/server/workspace-knowledge'
import { readIntegrationState } from '@/server/integration-store'
import { streamLiveAnswer, type ChatHistory } from '@/server/live-answer'

const requests=new Map<string,{count:number;until:number}>()
export const Route = createFileRoute('/api/chat')({server:{handlers:{POST:async ({request})=>{
  if(!authEnvironment().trustedOrigins.includes(request.headers.get('origin')||''))return Response.json({error:'Invalid request origin.'},{status:403})
  const user=await getWorkspaceUser(request.headers)
  if(!user)return Response.json({error:'Sign in to continue.'},{status:401})
  let data:unknown
  try{data=await request.json()}catch{return Response.json({error:'Invalid request.'},{status:400})}
  if(!data || typeof data!=='object' || !('prompt' in data) || typeof data.prompt!=='string' || !data.prompt.trim() || data.prompt.length>4000)return Response.json({error:'Enter a question of up to 4,000 characters.'},{status:400})
  const scope='scope' in data && typeof data.scope==='string'?data.scope:'All knowledge'
  if(!['All knowledge','Portfolio companies','Deal flow','LP relationships'].includes(scope))return Response.json({error:'Choose a valid knowledge scope.'},{status:400})
  if(!canUseLP(user.role) && isLPRequest(data.prompt,scope))return Response.json({error:'LP relationships require admin access.'},{status:403})
  const liveEmail=hasEmailKnowledge()
  const settings=(await readIntegrationState()).settings
  if(user.role!=='admin' && !settings.portfolioScoutAccess && !settings.thesis.scoutAccess && !settings.notionScoutAccess)return Response.json({error:'Your admin has not shared knowledge sources with scouts yet.'},{status:403})
  if(!process.env.OPENAI_API_KEY)return Response.json({error:'Live responses are not connected yet.'},{status:503})
  const rawHistory='history' in data?data.history:[]
  if(!Array.isArray(rawHistory) || rawHistory.length>12 || rawHistory.some(m=>!m || !['user','assistant'].includes(m.role) || typeof m.content!=='string' || m.content.length>8000) || JSON.stringify(rawHistory).length>35_000)return Response.json({error:'Conversation context is too long. Start a new chat.'},{status:400})
  const history=rawHistory as ChatHistory, prompt=data.prompt.trim()
  const window=requests.get(user.id)
  if(window && window.until>Date.now() && window.count>=20)return Response.json({error:'Please wait a moment before asking another question.'},{status:429,headers:{'Retry-After':'60'}})
  if(window && window.until>Date.now())window.count++;else requests.set(user.id,{count:1,until:Date.now()+60_000})
  for(const [id,value] of requests)if(value.until<Date.now())requests.delete(id)
  const encoder=new TextEncoder(),abort=new AbortController(),signal=AbortSignal.any([request.signal,abort.signal,AbortSignal.timeout(90_000)])
  let cancelled=false
  const stream=new ReadableStream<Uint8Array>({
    async start(controller){
      const emit=(event:ChatEvent)=>{if(!cancelled && !signal.aborted)controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))}
      try{
        emit({type:'mode',evidence:false});emit({type:'loading',label:'Gathering context'})
        if(liveEmail&&user.role==='admin')emit({type:'tool',tool:{id:'supermemory-search',label:'Search correspondence',source:'Supermemory',detail:'Searching connected Gmail knowledge',status:'running'}})
        const previousQuestion=history.filter(m=>m.role==='user').slice(-2).map(m=>m.content).join(' ').slice(0,1200)
        const query=prompt.length<100 && previousQuestion && !queryEntities(prompt).length?`${prompt}\nPrevious question: ${previousQuestion}`:prompt
        const {sources,issues}=await retrieveWorkspaceSources(query,user.role,scope,signal)
        emit({type:'sources',sources})
        if(liveEmail&&user.role==='admin')emit({type:'tool',tool:{id:'supermemory-search',label:'Search correspondence',source:'Supermemory',detail:issues.includes('Email lookup is unavailable.')?'Email lookup is unavailable.':`${sources.filter(s=>s.provider==='Gmail').length} relevant emails`,status:'complete'}})
        for(const provider of [...new Set(sources.filter(s=>s.provider!=='Gmail').map(s=>s.provider))])emit({type:'tool',tool:{id:`source-${provider}`,label:provider==='Airtable'?'Read fund and company records':provider==='Notion'?'Read selected pages':'Read fund guidance',source:provider,detail:`${sources.filter(s=>s.provider===provider).length} relevant sources`,status:'complete'}})
        emit({type:'thinking',activities:[{primary:sources.length?'Reviewed source evidence':'Preparing a response',secondary:sources.length?`${sources.length} ${sources.length===1?'source':'sources'}`:'Connected knowledge'},...issues.map(issue=>({primary:issue}))]})
        const guidance=(user.role==='admin'||settings.thesis.scoutAccess)&&/assess|temp check|investment (?:fit|case)|thesis fit/i.test(prompt)?settings.thesis.assessment:''
        await streamLiveAnswer(prompt,sources,history,signal,text=>emit({type:'delta',text}),fetch,issues,guidance)
        emit({type:'done',sources,followUps:[]})
      }catch(error){
        if(!cancelled && !request.signal.aborted)controller.enqueue(encoder.encode(`data: ${JSON.stringify({type:'error',message:signal.aborted?'The response took too long. Please retry.':error instanceof Error?error.message:'The response was interrupted. Please retry.'})}\n\n`))
      }finally{if(!cancelled)controller.close()}
    },
    cancel(){cancelled=true;abort.abort()},
  })
  return new Response(stream,{headers:{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-store, no-transform','X-Accel-Buffering':'no'}})
}}}})
