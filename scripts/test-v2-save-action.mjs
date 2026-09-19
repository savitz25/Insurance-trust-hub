// Execute the real server action with isolated adapters; never connects to a backend.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { transform } from 'esbuild';
const {code}=await transform(readFileSync(new URL('../actions/my-insurance.ts',import.meta.url),'utf8'),{loader:'ts',format:'cjs'});
function action(owner) {
  const writes=[];
  const db={from:()=>({upsert:async row=>{writes.push(row);return {error:null}}})};
  const adapters={
    'next/cache':{revalidatePath:()=>{}},
    '@/lib/my-insurance/auth':{requireAuthenticatedUser:async()=>({id:owner})},
    '@/lib/supabase/server':{createClient:async()=>db},
    '@/lib/my-insurance/ensure-profile':{ensureUserProfile:async()=>{}},
    '@/lib/my-insurance/constants':{MY_INSURANCE_PATH:'/my-insurance'},
  };
  const actionModule={exports:{}};
  new Function('module','exports','require',code)(actionModule,actionModule.exports,id=>adapters[id]??{});
  return {save:actionModule.exports.saveProviderAction,writes};
}
test('B3-I06 mocked server action preserves existing account destination',async()=>{
  const {save,writes}=action('owner-a');
  assert.equal((await save({providerSlug:'fixture',providerName:'Fixture',expectedUserId:'owner-a'})).ok,true);
  assert.deepEqual(writes,[{user_id:'owner-a',provider_slug:'fixture',provider_name:'Fixture'}]);
});
test('B3-I07 mocked server owner switch rejects before any account write',async()=>{
  const {save,writes}=action('owner-b');
  assert.equal((await save({providerSlug:'fixture',providerName:'Fixture',expectedUserId:'owner-a'})).ok,false);
  assert.equal(writes.length,0);
});
