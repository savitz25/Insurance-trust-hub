import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { upsertSavedProvider, loadState, getLastSaveError } from '../lib/my-insurance/storage';
const data = new Map<string,string>();
let blocked = false;
Object.defineProperty(globalThis, 'window', {value:new EventTarget(),configurable:true});
Object.defineProperty(globalThis, 'localStorage', {configurable:true,value:{
  getItem:(key:string)=>data.get(key)??null,
  setItem:(key:string,value:string)=>{if(blocked)throw new DOMException('blocked','QuotaExceededError');data.set(key,value)},
  removeItem:(key:string)=>data.delete(key),
}});
beforeEach(()=>{data.clear();blocked=false});
test('B3-I01/02/03 local contract and duplicate Save preserve identity and notes',()=>{
  upsertSavedProvider({providerSlug:'fixture',providerName:'Fixture',notes:'Private note',status:'shortlisted'});
  const first=loadState().savedProviders[0];
  upsertSavedProvider({providerSlug:'fixture',providerName:'Fixture',status:'shortlisted'});
  const rows=loadState().savedProviders;
  assert.equal(rows.length,1);assert.equal(rows[0].id,first.id);
  assert.equal(rows[0].notes,'Private note');assert.equal(rows[0].profilePath,'/providers/fixture');
  assert.equal(JSON.parse(data.get('ith:my-insurance:v1')!).savedProviders.length,1);
});
test('B3-I08 failed write preserves existing shortlist; existing error channel reports failure',()=>{
  upsertSavedProvider({providerSlug:'existing',providerName:'Existing',status:'shortlisted'});
  const before=data.get('ith:my-insurance:v1');blocked=true;
  upsertSavedProvider({providerSlug:'fixture',providerName:'Fixture',status:'shortlisted'});
  assert.match(getLastSaveError()!,/storage|save/i);
  assert.equal(data.get('ith:my-insurance:v1'),before);
});
test('B3-I03 shortlist cap does not mutate existing research',()=>{
  for(let n=0;n<3;n++) upsertSavedProvider({providerSlug:'fixture-'+n,providerName:'Fixture',status:'shortlisted'});
  const before=data.get('ith:my-insurance:v1');
  const result=upsertSavedProvider({providerSlug:'fourth',providerName:'Fourth',status:'shortlisted'});
  assert.equal(result.ok,false);assert.equal(data.get('ith:my-insurance:v1'),before);
});
