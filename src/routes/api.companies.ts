import { createFileRoute } from '@tanstack/react-router'
import { getPool } from '../server/db'
import { limitedJSON, privateJSON, requireAdmin } from '../server/api-access'
import { hasNotionDestination, syncCompanyToNotion } from '../server/notion-deals'
export const Route=createFileRoute('/api/companies')({server:{handlers:{
  GET:async({request})=>{const actor=await requireAdmin(request);if(actor instanceof Response)return actor
    const companies=await getPool().query(`select c.*, (select count(*)::int from vitamin_data.documents d where d.company_id=c.id) document_count from vitamin_data.companies c order by updated_at desc limit 200`)
    const ingestions=await getPool().query(`select id,status,decision,reason,company_id,created_at,updated_at from vitamin_data.ingestions order by created_at desc limit 100`)
    const documents=await getPool().query('select id,company_id,name,mime_type,created_at from vitamin_data.documents order by created_at desc limit 200')
    return privateJSON({companies:companies.rows,ingestions:ingestions.rows,documents:documents.rows,notionConfigured:await hasNotionDestination()})},
  POST:async({request})=>{const actor=await requireAdmin(request,true);if(actor instanceof Response)return actor;const body=await limitedJSON(request,5000)
    if(body.action!=='sync-notion'||typeof body.companyId!=='string')return privateJSON({error:'Invalid action.'},400)
    return privateJSON(await syncCompanyToNotion(body.companyId))},
}}})
