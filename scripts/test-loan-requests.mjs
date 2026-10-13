import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
let calls=[],result={data:'request-id',error:null},actor='11111111-1111-1111-1111-111111111111';
const actions={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/account/requests/actions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:actions,require:name=>name==='@/lib/bookshelf-server'?{requireBookshelfUser:async()=>({userId:actor,client:{rpc:async(name,args)=>{calls.push({name,args});return result;}}})}:name==='next/cache'?{revalidatePath(){}}:{}});
const owner='22222222-2222-2222-2222-222222222222',series='33333333-3333-3333-3333-333333333333',copy='44444444-4444-4444-4444-444444444444';
function form(){const f=new FormData();f.set('owner',owner);f.set('series',series);f.set('token','55555555-5555-5555-5555-555555555555');f.set('message','  借りたいです。  ');f.append('copies',copy);f.set('requester','forged-user');return f;}
const missing=form();missing.delete('copies');assert.ok((await actions.sendLoanRequest({},missing)).error);assert.equal(calls.length,0);
const duplicated=form();duplicated.append('copies',copy);assert.ok((await actions.sendLoanRequest({},duplicated)).error);assert.equal(calls.length,0);
const tooLong=form();tooLong.set('message','あ'.repeat(201));assert.ok((await actions.sendLoanRequest({},tooLong)).error);assert.equal(calls.length,0);
const sent=await actions.sendLoanRequest({},form());assert.equal(sent.sent,true);assert.equal(calls[0].args.p_message,'借りたいです。');assert.ok(!('p_requester' in calls[0].args),'Submitted sender identity must never be trusted');
const emoji=form();emoji.set('message','📚'.repeat(200));assert.equal((await actions.sendLoanRequest({},emoji)).sent,true,'Count Unicode code points consistently with the database');
const blank=form();blank.set('message','');assert.equal((await actions.sendLoanRequest({},blank)).sent,true,'Optional message');
result={data:null,error:{message:'ALREADY_REQUESTED'}};assert.match((await actions.sendLoanRequest({},form())).error,/送信済み/);
result={data:null,error:{message:'BOOK_UNAVAILABLE'}};assert.match((await actions.sendLoanRequest({},form())).error,/開き直して/);
result={data:null,error:{message:'offline'}};assert.match((await actions.sendLoanRequest({},form())).error,/保持/);
console.log('Loan request input validation, optional messages, Unicode limits, authenticated sender and failure recovery passed');
