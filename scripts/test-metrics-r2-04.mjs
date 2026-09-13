import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateInsurance, required } from './reconcile-network-metrics-r2-04.mjs';
import { buildInsuranceHomepageEvidenceInventory } from '../lib/metrics/insurance-home-evidence-inventory.ts';
import { projectHomeIntelFromNetworkMetrics } from '../lib/metrics/project-home-intel.ts';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const m=read('data/home/insurance-network-metrics-v1.json');
const census=read('data/home/insurance-metric-census-r2-04.json');
const sources=m.acceptedStateSnapshots;
const clone=x=>structuredClone(x);
test('accepted identity census reconciles independently of Illinois order volume',()=>{
 validateInsurance(sources,census);
 assert.deepEqual([m.nationalGraph.agencies,m.nationalGraph.legalInsurers],[82071,6185]);
 assert.equal(m.reconciliation.identity.unexplainedDelta,0);
 const changed=clone(sources);changed.IL.directors_orders.observation_rows++;changed.IL.directors_orders.distinct_ids++;
 validateInsurance(changed,census);
 assert.equal(census.nationalGraph.legalInsurers,6185);
});
test('Illinois name-field partition reconciles without assuming identity or adverse disposition',()=>{
 const o=sources.IL.directors_orders;
 assert.deepEqual([o.observation_rows,o.distinct_ids,o.with_company_name,o.with_person_name,o.with_both_names],[2896,2896,782,2321,210]);
 assert.deepEqual(m.reconciliation.states.IL.orderNamePartition,{withCompanyOrPerson:2893,withoutEither:3,unexplainedDelta:0});
 for(const key of ['EXACT_COMPANY_ENFORCEMENT_ASSOCIATIONS','EXACT_PRODUCER_ENFORCEMENT_ASSOCIATIONS','EXACT_PROFILE_ATTACHMENTS']) assert.equal(sources.IL.enforcement_attachment[key],0);
 const bad=clone(sources);bad.IL.enforcement_attachment.EXACT_COMPANY_ENFORCEMENT_ASSOCIATIONS=1;
 assert.throws(()=>validateInsurance(bad,census));
});
test('search-only null survives export and homepage; missing input fails rather than becoming zero',()=>{
 const rows=buildInsuranceHomepageEvidenceInventory(m);
 for(const key of ['company_lookup','agency_roster','producer_roster','complaints','market_conduct']) {
  assert.equal(m.reconciliation.states.IL.capabilities[key].count,null);
  const row=rows.find(r=>r.sourceField===`${key}.count` || r.key===(key==='company_lookup'?'il_authorized_companies':`il_${key}_count`));
  assert(row);assert.equal(row.value,null);assert.notEqual(row.display,'0');
 }
 assert.equal(required({count:0},'count'),0);assert.equal(required({count:null},'count'),null);
 assert.throws(()=>required({},'count'));
 const bad=clone(sources);bad.IL.agency_roster.count=0;assert.throws(()=>validateInsurance(bad,census));
 const invalid=clone(m);invalid.metrics.find(r=>r.key==='insurance_agencies').value=null;
 assert.throws(()=>projectHomeIntelFromNetworkMetrics(invalid));
});
test('Colorado evidence and exact distinct NAIC matches remain distinct from identities',()=>{
 assert.equal(sources.CO.complaints.standard_ratio_index.company_line_rows,415);
 assert.equal(m.reconciliation.measures.find(r=>r.key==='co_complaints_standard_ratio_index_company_line_rows').grain,'complaint_company_line_observation');
 assert.equal(sources.CO.naic_crosswalk.complaint_standard_2025.EXACT_EXISTING_LEGAL_INSURER_MATCHES,291);
 const bad=clone(sources);bad.CO.naic_crosswalk.statistical_report.EXACT_EXISTING_LEGAL_INSURER_MATCHES++;
 assert.throws(()=>validateInsurance(bad,census));
 const identity=clone(census);identity.nationalGraph.legalInsurers+=1834;assert.throws(()=>validateInsurance(sources,identity));
});
test('all four states are exported by source field with clocks and homepage values',()=>{
 const rows=buildInsuranceHomepageEvidenceInventory(m);
 for(const measure of m.reconciliation.measures) {
  const row=rows.find(r=>r.key===measure.key);assert(row,measure.key);
  assert.equal(row.value,measure.value);assert.equal(row.grain,measure.grain);
  assert.equal(row.retrievedAt,measure.retrievedAt);assert.equal(row.snapshotAsOf,measure.snapshotAsOf);
 }
 assert.equal(m.reconciliation.states.IL.sourceAsOf,null);
 assert.equal(m.reconciliation.states.IL.retrievedAt,'2026-09-12T16:41:31Z');
 assert.equal(sources.VA.statistical_report.observation_rows,1546);
 assert.equal(sources.NY.enforcement_actions.observation_rows,147);
 const bad=clone(sources);bad.NY.enforcement_actions.naic_attached=true;assert.throws(()=>validateInsurance(bad,census));
 assert.equal(new Set(m.metrics.map(r=>r.key)).size,m.metrics.length);
});
