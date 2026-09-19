// Run while qa-v2-save.mjs serves localhost. Real browser storage; auth/cloud MOCKED.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync,openSync,closeSync,readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const dir=mkdtempSync(join(tmpdir(),'b3-insurance-'));
let seq=0;
function command(args,input) {
 const path=join(dir,seq+++'.json'), fd=openSync(path,'w');
 const child=spawnSync(process.env.AGENT_BROWSER_BIN || 'agent-browser',['--session','b3-insurance-tests','--json',...args],
 {input,encoding:'utf8',stdio:['pipe',fd,'ignore'],timeout:30000});
 closeSync(fd); assert.ifError(child.error);
 const result=JSON.parse(readFileSync(path,'utf8'));
 assert.equal(result.success,true,result.error); return result.data;
}
const browser=(...args)=>command(args);
const evaluate=source=>command(['eval','--stdin'],source).result;
const delay=ms=>new Promise(done=>setTimeout(done,ms));
async function until(source) { for(let n=0;n<60;n++){if(evaluate(source))return;await delay(100);}assert.fail(source); }
async function reset() {
 browser('open','http://127.0.0.1:4312');
 evaluate('localStorage.clear(); sessionStorage.clear()'); browser('reload');
 await until('Boolean(window.b3 && document.querySelector("button"))');
}
const state=`JSON.parse(localStorage.getItem('ith:my-insurance:v1')||'{"savedProviders":[]}').savedProviders`;
const click=()=>evaluate("document.querySelector('button').click()");
try {
 await reset();
 browser('focus','button'); browser('press','Enter');
 await until(state+'.length===1');
 assert.equal(evaluate(state)[0].providerSlug,'b3-fixture');
 browser('reload'); await until("document.querySelector('button')?.textContent.includes('In My')");
 assert.equal(evaluate(state).length,1);
 console.log('B3-01/02/09 PASS browser keyboard immediate Save and real reload persistence');

 await reset();
 evaluate("document.querySelector('button').click();document.querySelector('button').click();document.querySelector('button').click()");
 assert.equal(evaluate(state).length,1);
 console.log('B3-03 PASS rapid duplicate clicks create one row');

 await reset(); evaluate('window.b3.auth(null,true)'); await delay(100); click();
 assert.equal(evaluate(state).length,1);
 assert.equal(evaluate('window.b3.cloud.length'),0);
 evaluate("window.b3.auth('owner-a')");
 assert.equal(evaluate('window.b3.cloud.length'),0);
 console.log('B3-04/05 PASS delayed auth: explicit device save, no guessed guest/account mutation');

 await reset();
 evaluate("window.b3.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('blocked','QuotaExceededError')}");
 click(); await until("Boolean(document.querySelector('[role=alert]'))");
 assert.equal(evaluate(state).length,0);
 evaluate('Storage.prototype.setItem=window.b3.originalSetItem'); click();
 await until(state+'.length===1');
 console.log('B3-08 PASS blocked fresh storage honest error and recovery');

 
 await reset(); evaluate("window.b3.auth('owner-a');window.b3.failCloud=true");
 await delay(100); click(); await until("document.body.textContent.includes('account sync failed')");
 assert.equal(evaluate(state).length,1);
 assert.equal(evaluate('window.b3.cloud.length'),1);
 assert.equal(evaluate('window.b3.cloud[0].expectedUserId'),'owner-a');
 assert.equal(evaluate('window.b3.events.length'),0);
 assert.equal(evaluate("document.body.textContent.includes('synced to your account')"),false);
 console.log('B3-06/08 PASS MOCKED cloud failure never claims account success');

 await reset(); evaluate("window.b3.auth('owner-a')"); await delay(100);
 evaluate("document.querySelector('button').click();document.querySelector('button').click()");
 await until('window.b3.events.length===1');
 assert.equal(evaluate('window.b3.cloud.length'),1);
 assert.equal(evaluate('window.b3.cloud[0].providerSlug'),'b3-fixture');
 assert.equal(evaluate(state).length,1);
 console.log('B3-03/06 PASS MOCKED authenticated Save preserves slug/owner contract and deduplicates effects');

 await reset(); evaluate("window.b3.auth('owner-a');window.b3.delayCloud=true"); await delay(100); click();
 await until('Boolean(window.b3.finishCloud)');
 evaluate("window.b3.render('different-profile');window.b3.auth('owner-b')"); await delay(100);
 evaluate('window.b3.finishCloud()'); await delay(100);
 assert.equal(evaluate('window.b3.events.length'),0);
 assert.equal(evaluate(state).length,1);
 assert.equal(evaluate(state)[0].providerSlug,'b3-fixture');
 console.log('B3-07 PASS old completion cannot mark replacement profile/account');

 await reset();
 evaluate("const real=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(this===sessionStorage)throw new Error('blocked session');return real.call(this,k,v)}");
 click(); await until(state+'.length===1');
 console.log('B3-08 PASS sessionStorage unavailable does not prevent device Save');
 
 for(const width of [1440,390,320]){
   await reset(); browser('set','viewport',String(width),'900');
   browser('focus','button');
   assert.equal(evaluate("document.activeElement===document.querySelector('button')"),true);
   assert.equal(evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
   browser('screenshot',join(dir,'width-'+width+'.png'));
 }
 console.log('B3-09 PASS component fixture 1440/390/320 keyboard, focus, no overflow');
 console.log('Evidence directory: '+dir);
} finally { browser('close'); }
