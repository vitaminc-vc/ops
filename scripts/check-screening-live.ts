import assert from 'node:assert/strict'
import {config} from 'dotenv'
import {mkdir,writeFile} from 'node:fs/promises'
import {screenEmail} from '../src/server/screening'
import {screeningFixtures} from './screening-fixtures'
config({path:'.env.local',quiet:true})
assert.ok(process.env.OPENAI_API_KEY,'A live screening model key is required.')
const policy={mode:'enforced' as const,model:'gpt-6-luna',blockedSenders:['people@fund.example'],blockedLabels:['HR','Payroll','People operations']}
const rows:{id:string;expected:string[];decision:string;category:string;method:string;pass:boolean;sensitive:boolean}[]=[]
for(let i=0;i<screeningFixtures.length;i+=3){
 const batch=await Promise.all(screeningFixtures.slice(i,i+3).map(async fixture=>{const result=await screenEmail(fixture.email,policy);const pass=fixture.expected.includes(result.decision);console.log(`${pass?'PASS':'FAIL'} ${fixture.id}: ${result.decision} (${result.method})`);return {id:fixture.id,expected:fixture.expected,decision:result.decision,category:result.category,method:result.method,pass,sensitive:!!fixture.sensitive}}));rows.push(...batch)
}
const failures=rows.filter(r=>!r.pass),unsafe=rows.filter(r=>r.sensitive&&r.decision==='include')
const report={date:new Date().toISOString(),model:policy.model,enforcement:'enforced',total:rows.length,passed:rows.length-failures.length,unsafeIncludes:unsafe.length,rows}
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/screening-qa.json',JSON.stringify(report,null,2))
console.log(JSON.stringify({total:rows.length,passed:report.passed,unsafeIncludes:unsafe.length,failures:failures.map(f=>f.id)}))
assert.equal(unsafe.length,0,'Sensitive HR was allowed through.');assert.equal(failures.length,0,'Screening expectations failed. See artifacts/screening-qa.json.')
