import { createFileRoute } from '@tanstack/react-router'
import { requireAdmin, privateJSON } from '../server/api-access'
import { getPool } from '../server/db'
export const Route=createFileRoute('/api/documents/$id')({server:{handlers:{GET:async({request,params})=>{
  const actor=await requireAdmin(request);if(actor instanceof Response)return actor
  const doc=(await getPool().query("select d.* from vitamin_data.documents d join vitamin_data.ingestions i on i.id=d.ingestion_id where d.id=$1 and i.decision='include'",[params.id])).rows[0]
  if(!doc)return privateJSON({error:'Document unavailable.'},404)
  return new Response(new Uint8Array(doc.data),{headers:{'Content-Type':doc.mime_type,'Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(doc.name)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})
}}}})
