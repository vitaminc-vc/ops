import { createFileRoute } from '@tanstack/react-router'
import { limitedJSON, privateJSON, requireAdmin } from '../server/api-access'
import { getPool } from '../server/db'
import { agentReadiness, createAgentRun, lpSnapshot } from '../server/agent-runs'
export const Route=createFileRoute('/api/agent-runs')({server:{handlers:{
  GET:async({request})=>{const user=await requireAdmin(request);if(user instanceof Response)return user;const runs=await getPool().query('select * from vitamin_data.agent_runs order by created_at desc limit 100');return privateJSON({runs:runs.rows,readiness:await agentReadiness(),lp:await lpSnapshot()})},
  POST:async({request})=>{const user=await requireAdmin(request,true);if(user instanceof Response)return user
    try{const body=await limitedJSON(request,10_000);if(!['scout','assessment','lp'].includes(String(body.kind))||typeof body.request!=='string')return privateJSON({error:'Invalid run request.'},400)
      return privateJSON(await createAgentRun(body.kind as 'scout'|'assessment'|'lp',body.request,user))
    }catch(error){return privateJSON({error:error instanceof Error?error.message:'Run failed.'},400)}},
}}})
