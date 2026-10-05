import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {config} from 'dotenv'
import {eq} from 'drizzle-orm'
import {createDatabase} from '../src/server/db'
import {user} from '../src/db/schema'
config({path:'.env.local',quiet:true})
const qa=JSON.parse(await readFile('.private/demo-qa.json','utf8')),base='http://127.0.0.1:3000',{db,pool}=createDatabase()
let roleChanged=false
const call=(path:string,cookie=qa.cookie,body?:unknown,origin=base)=>fetch(base+path,{method:body?'POST':'GET',headers:{...(cookie?{cookie}:{}),...(body?{origin,'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,redirect:'manual'})
try{
 const [account]=await db.select({email:user.email}).from(user).where(eq(user.id,qa.id));assert.equal(account.email,qa.email);assert.match(qa.email,/^vitamin-c-demo-qa-.*@example\.invalid$/)
 assert.equal((await call('/api/integrations','')).status,401);assert.equal((await call('/api/portfolio','')).status,401)
 assert.equal((await call('/api/integrations',qa.cookie,{action:'refresh-thesis'},'https://untrusted.invalid')).status,403)
 const overviewResponse=await call('/api/integrations');assert.equal(overviewResponse.status,200);const overview=await overviewResponse.json();assert.equal(overview.settings.screening.mode,'off')
 const encoded=JSON.stringify(overview);for(const key of ['AIRTABLE_API_KEY','OPENAI_API_KEY','CONNECTOR_ENCRYPTION_KEY','SUPERMEMORY_API_KEY'])if(process.env[key])assert.ok(!encoded.includes(process.env[key]!),'Secret leaked into overview')
 assert.equal((await call('/api/integrations',qa.cookie,{action:'save-settings',settings:{...overview.settings,screening:{...overview.settings.screening,mode:'on'}}})).status,400)
 const thesis=await call('/api/integrations',qa.cookie,{action:'refresh-thesis'});assert.equal(thesis.status,200)
 const portfolioResponse=await call('/api/portfolio');assert.equal(portfolioResponse.status,200);const portfolio=await portfolioResponse.json();assert.ok(portfolio.companies.some((c:any)=>c.name==='Satellites on Fire'));assert.ok(!portfolio.companies.some((c:any)=>c.name==='Cirra'));assert.equal(portfolio.source,'Airtable')
 const screen=await call('/api/integrations',qa.cookie,{action:'screen-email',email:{from:'hr@fund.example',subject:'Personnel review',body:'Confidential individual employee payroll and performance review.'}});const screening=await screen.json();assert.equal(screen.status,200);assert.equal(screening.enforced,false);assert.equal(screening.result.decision,'exclude')
 await db.update(user).set({role:'scout'}).where(eq(user.id,qa.id))
 roleChanged=true
 for(const path of ['/api/integrations','/api/portfolio','/api/knowledge/email?id=vitaminc_luke_gmail_1a0f317f9c5e30e9'])assert.equal((await call(path)).status,403)
 assert.equal((await call('/api/integrations',qa.cookie,{action:'refresh-thesis'})).status,403)
 console.log('Live integration checks passed: admin-only APIs, fresh role checks, origin validation, secrets withheld, real Airtable portfolio, source thesis refresh, screening lock and HR exclusion without enforcement.')
}finally{if(roleChanged)await db.update(user).set({role:'admin'}).where(eq(user.id,qa.id));await pool.end()}
