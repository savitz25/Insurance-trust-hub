import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const read = (root, path) => JSON.parse(readFileSync(join(root, path), "utf8"));
export function required(source, path) {
  const value = path.split(".").reduce((v, k) => v?.[k], source);
  assert(value === null || (Number.isSafeInteger(value) && value >= 0), `Missing/invalid accepted count: ${path}`);
  return value;
}
export function validateInsurance(sources, census) {
  for (const key of ["agencies","persons","legalInsurers","appointingCarriers","insuranceGroups","consumerBrands","credentials","agencyCredentials","personCredentials","cmsMarketplaceObservations","loaObservations","contactObservations","publicDirectoryListings","appointedBy","appointedTo","associatedWith","appointerResolvesTo","regulatoryEvidence"]) {
    assert.notEqual(required(census.nationalGraph,key), null, `Census count unavailable: ${key}`);
  }
  assert.equal(census.nationalGraph.credentials,census.nationalGraph.agencyCredentials+census.nationalGraph.personCredentials);

  assert.equal(census.nationalGraph.agencies, 82071, "New agency census requires explicit identity reconciliation");
  assert.equal(census.nationalGraph.legalInsurers, 6185, "New insurer census requires explicit identity reconciliation");
  for (const [code, s] of Object.entries(sources)) {
    for (const [key, value] of Object.entries(s.expansion_ledger)) {
      if (/^NET_NEW_CANONICAL_|^EXISTING_ORGANIZATIONS_ENRICHED$|^GRAPH_WRITES$|^EXACT_PROFILE_ATTACHMENTS$/.test(key)) assert.equal(value, 0, `${code}.${key}: review identity impact before publication`);
    }
    if (s.profile_attachments) {
      assert.equal(s.profile_attachments.EXACT_PROFILE_ATTACHMENTS, 0);
      assert.equal(s.profile_attachments.graph_write, false);
    }
    if (s.naic_crosswalk) for (const layer of Object.values(s.naic_crosswalk)) {
      if (layer && typeof layer === "object" && "SOURCE_DISTINCT_NAIC" in layer) {
        assert.equal(layer.SOURCE_DISTINCT_NAIC, layer.EXACT_EXISTING_LEGAL_INSURER_MATCHES + layer.UNMATCHED_NAIC);
      }
    }
  }
  const il = sources.IL, o = il.directors_orders;
  for (const value of Object.values(il.enforcement_attachment)) if (typeof value === "number") assert.equal(value, 0, "Illinois has no accepted exact attachments");
  assert.equal(o.observation_rows, o.distinct_ids);
  assert(o.with_both_names <= Math.min(o.with_company_name, o.with_person_name));
  assert(o.with_company_name + o.with_person_name - o.with_both_names <= o.observation_rows);
  for (const key of ["company_lookup", "agency_roster", "producer_roster", "complaints", "market_conduct"]) assert.equal(il[key].count, null, `${key}: search/research universe is unknown`);
  assert.equal(sources.NY.enforcement_actions.naic_attached, false);
}

const specs = {
 CO: [
 ["statistical_report.naic_companies_tab.company_directory_rows", "Statistical / NAIC observations", "statistical_report_directory_row"],
 ["surplus_lines.eligible_identities", "Surplus-lines eligibility rows", "surplus_lines_observation"],
 ["complaints.standard_ratio_index.company_line_rows", "Complaint company by line observations", "complaint_company_line_observation", "COMPLAINTS"],
 ["complaints.standard_ratio_index.distinct_naic", "Distinct NAIC IDs in complaint company by line observations", "source_identifier", "COMPLAINTS"],
 ],
 VA: [
 ["statistical_report.observation_rows", "Dated NAIC-bearing report observations", "statistical_report_directory_row"],
 ["regulatory_actions.observation_rows", "Regulatory action observations", "regulatory_evidence_row"],
 ["regulatory_actions.distinct_cases", "Regulatory case identifiers", "source_identifier"],
 ["market_conduct.observation_rows", "Market-conduct examination observations", "market_conduct_examination_listing", "EXAMINATIONS"],
 ["financial_exams.listing_rows", "Financial examination listings", "financial_examination_listing", "EXAMINATIONS"],
 ],
 NY: [
 ["company_directory.directory_rows", "DFS company directory rows", "ny_dfs_company_directory_row"],
 ["company_directory.ny_domicile_rows", "Directory domicile observations", "state_evidence_observation"],
 ["company_directory.org_type_distribution.AH", "Directory AH observations", "state_evidence_observation"],
 ["company_directory.distinct_group_numbers", "Distinct directory group identifiers", "source_identifier"],
 ["auto_complaints.observation_rows", "2024 auto-market observations", "auto_market_report_observation", "COMPLAINTS"],
 ["enforcement_actions.observation_rows", "DFS enforcement observations (unattached)", "regulatory_evidence_row"],
 ],
 IL: [
 ["directors_orders.observation_rows", "Illinois Department of Insurance Director's Order observations", "directors_order_observation"],
 ["directors_orders.distinct_ids", "Distinct Director's Order IDs", "source_identifier"],
 ["directors_orders.with_company_name", "Director's Orders with a company name", "directors_order_observation"],
 ["directors_orders.with_person_name", "Director's Orders with a person name", "directors_order_observation"],
 ["directors_orders.with_both_names", "Director's Orders with both name fields", "directors_order_observation"],
 ],
 OR: [
 ["dfr_orders.document_rows", "Oregon DFR insurance-related administrative-order documents", "dfr_insurance_order_document"],
 ["dfr_orders.distinct_cases", "Distinct DFR insurance case numbers", "source_identifier"],
 ["complaints.row_total", "Oregon DFR 2025 insurer-line complaint table rows", "dfr_complaint_table_row", "COMPLAINTS"],
 ["market_conduct.report_rows", "Oregon market-conduct examination report listings", "market_conduct_examination_listing", "EXAMINATIONS"],
 ["financial_exams.report_rows", "Oregon financial examination report listings", "financial_examination_listing", "EXAMINATIONS"],
 ],
 PA: [
 ["company_lookup.distinct_naic", "PID licensed companies (distinct NAIC)", "authorized_company_row", "ENTITY_IDENTITY"],
 ["surplus_lines.distinct_naic", "Eligible surplus-lines companies (distinct NAIC)", "surplus_lines_observation", "RATE_MARKET"],
 ["complaints.row_total", "2025 complaint comparison insurer-line rows", "consumer_complaint_observation", "COMPLAINTS"],
 ["enforcement.enforcement_actions", "Enforcement Actions documents", "regulatory_evidence_row"],
 ["market_conduct.document_rows", "Market Conduct Actions documents", "market_conduct_examination_listing", "EXAMINATIONS"],
 ["financial_exams.document_rows", "Financial examination report documents", "financial_examination_listing", "EXAMINATIONS"],
 ["liquidation.document_rows", "Liquidation/rehab/discharge catalog documents", "regulatory_evidence_row"],
 ],
 NC: [
 ["licensing_actions.document_rows", "NCDOI Licensing Action catalog rows", "regulatory_evidence_row"],
 ["licensing_actions.producer_rows", "Insurance Producer licensing-action rows", "regulatory_evidence_row"],
 ["market_share.homeowners_multiple_peril_rows", "2025 homeowners multiple peril company-line rows", "market_share_company_line_row", "RATE_MARKET"],
 ["market_conduct.document_rows", "Market Regulation examination report listings", "market_conduct_examination_listing", "EXAMINATIONS"],
 ["financial_exams.document_rows", "Financial examination report listings", "financial_examination_listing", "EXAMINATIONS"],
 ["receiverships.named_current_estates", "Named current receivership/liquidation/rehab estates", "regulatory_evidence_row"],
 ]
};
const names = { CO:"Colorado", VA:"Virginia", NY:"New York", IL:"Illinois", OR:"Oregon", PA:"Pennsylvania", NC:"North Carolina" };
const slugs = { CO:"colorado", VA:"virginia", NY:"new-york", IL:"illinois", OR:"oregon", PA:"pennsylvania", NC:"north-carolina" };
export function reconcile(manifest, root, census) {
  const paths = Object.fromEntries(Object.entries(slugs).map(([k,v]) => [k, `lib/${v}-intelligence/accepted-snapshot.json`]));
  const sources = Object.fromEntries(Object.entries(paths).map(([k,v])=>[k,read(root,v)]));
  validateInsurance(sources,census);
  const measures = [], states = {};
  for (const [code, source] of Object.entries(sources)) {
    const state = states[code] = {status:"STATE_SOURCE_LIVE", scope:"Accepted evidence layers; not a current insurer/agency census", specialistComplete:null,
      sourceArtifact:paths[code], sourceAsOf:source.source_as_of ?? null, snapshotAsOf:source.snapshot_as_of ?? null,
      retrievedAt:source.retrieved_at ?? null, sourceGeneratedAt:source.generated_at ?? null, capabilities:{}, identityImpact:source.expansion_ledger};
    const add = (path,label,grain,family="REGULATORY_ENFORCEMENT", override) => {
      const value = override === undefined ? required(source,path) : override;
      const section = path.split(".").slice(0,-1).reduce((v,k)=>v[k],source);
      const parent = source[path.split(".")[0]];
      const clocks = {sourceAsOf:section.source_as_of ?? parent.source_as_of ?? null, sourcePeriodEnd:section.period_end ?? parent.period_end ?? null, reportedAsOf:section.reported_as_of ?? parent.reported_as_of ?? null, snapshotAsOf:section.snapshot_as_of ?? state.snapshotAsOf,
        retrievedAt:section.retrieved_at ?? parent.retrieved_at ?? state.retrievedAt};
      if(value!==null) state.capabilities[path]={status:"STATE_SOURCE_LIVE",sourceStatus:"ACCEPTED_SOURCE_LAYER",count:value,grain,sourceField:path};
      measures.push({key:`${code.toLowerCase()}_${path.replaceAll(".","_")}`,label:code==="IL" && path==="directors_orders.observation_rows" ? label : `${names[code]}: ${label}`,
        value,valueState:value===null?"UNKNOWN":"KNOWN",unit:"count",grain,family,denominator:"Source-defined layer only; no cross-layer entity total",description:label,
        coverage:names[code],contributingSourceSystems:[paths[code]],sourceArtifact:paths[code],sourceField:path,destination:`/${slugs[code]}`,...clocks,generatedAt:manifest.generatedAt,
        publicationStatus:value===null?"PUBLIC_UNKNOWN":"PUBLIC",trace:{counts:label,doesNotCount:"New canonical agencies, legal insurers, profile attachments, violations or a complete state census",contributingSourceSystems:[paths[code]],geographicCoverage:names[code],sourceDates:JSON.stringify(clocks),generationDate:manifest.generatedAt,
          ...(value===null?{whyUnknown:"Search-only or public research path: no defensible bulk universe was acquired."}:{})}});
    };
    for (const spec of specs[code]) {
      const entry=[...spec];
      if(code==="NY" && entry[0]==="auto_complaints.observation_rows") entry[1]=`${source.auto_complaints.latest_year} auto-market observations`;
      add(...entry);
    }
    if (source.naic_crosswalk) for (const [layer, counts] of Object.entries(source.naic_crosswalk)) {
      if (counts && typeof counts === "object" && "SOURCE_DISTINCT_NAIC" in counts) add(`naic_crosswalk.${layer}.EXACT_EXISTING_LEGAL_INSURER_MATCHES`,`${layer.replaceAll("_"," ")}: exact existing NAIC identity matches`,"exact_naic_identity_match");
    }
    for (const [key, section] of Object.entries(source)) {
      if (section && typeof section === "object" && "count" in section && section.count === null) {
        const native = section.coverage ?? Object.values(section).find(v=>typeof v==="string" && /SEARCH_ONLY|RESEARCH_PATH|NOT_ACQUIRED/.test(v)) ?? "UNKNOWN";
        const status = native.includes("OPEN_SEARCH_ONLY")?"OPEN_SEARCH_ONLY":native.includes("PUBLIC_RESEARCH_PATH")?"PUBLIC_RESEARCH_PATH":native.includes("REQUEST_ONLY")?"REQUEST_ONLY":"NOT_ACQUIRED";
        state.capabilities[key]={status,sourceStatus:native,count:null,sourceField:`${key}.count`};
        add(`${key}.count`,`${key.replaceAll("_"," ")} bulk universe (unknown)`,"unknown_state_universe");
      }
    }
  }
  const o=sources.IL.directors_orders;
  states.IL.orderNamePartition={withCompanyOrPerson:o.with_company_name+o.with_person_name-o.with_both_names,withoutEither:o.observation_rows-(o.with_company_name+o.with_person_name-o.with_both_names),unexplainedDelta:0};
  states.IL.exactAttachments=sources.IL.enforcement_attachment;
  const sql=read(root,"data/reports/ins-home-003b-sql-lock.json");
  assert.equal(Object.values(sql.buckets).reduce((a,b)=>a+b,0),sql.d2);
  assert.equal(sql.d1,census.nationalGraph.agencies);
  manifest.homepageInputs={loaByDataset:read(root,"data/reports/ins-nat-012-person-loa.json").source_row_counts,agencyMultistate:{d1:sql.d1,d2:sql.d2,d3:sql.d3,d4:sql.d4,...sql.buckets,retrievedAt:"2026-08-29T05:48:24.729Z",snapshotAsOf:sql.generatedAt,includedStates:sql.includedStates,sourceDatasets:sql.sourceDatasets}};
  const officialClocks=[];
  const collectClocks=value=>{
    if (!value || typeof value!=="object") return;
    for(const [key,child] of Object.entries(value)) {
      if((key==="source_as_of" || key==="sourceAsOf") && typeof child==="string" && /^\d{4}-\d{2}-\d{2}/.test(child)) officialClocks.push(child.slice(0,10));
      else if(child && typeof child==="object") collectClocks(child);
    }
  };
  collectClocks(sources);
  const cms=manifest.metrics.find(m=>m.key==="cms_marketplace_evidence_observations");
  if(cms.sourceAsOf) officialClocks.push(cms.sourceAsOf);
  manifest.newestDocumentedSourceAsOf=officialClocks.sort().at(-1) ?? null;
  manifest.newestDocumentedSourceAsOfNote="Newest explicit sourceAsOf/source_as_of in the reconciled state artifacts and CMS source. Count-query retrieval, accepted snapshot dates and build clocks are excluded. This is not a network-wide freshness guarantee.";
  manifest.contractRevision="ATH-METRICS-R2-04";
  manifest.reconciliation={states,measures,identity:{agencies:census.nationalGraph.agencies,legalInsurers:census.nationalGraph.legalInsurers,agencyDeltaFromStateEvidence:0,insurerDeltaFromStateEvidence:0,unexplainedDelta:0},aggregationPolicy:"No cross-layer sum; exact matches are not profile attachments"};
  // Preserve complete accepted context for downstream consumers, including unenumerated capability limitations.
  manifest.acceptedStateSnapshots=sources;
  manifest.stateClocks=Object.fromEntries(Object.entries(states).map(([code,state])=>[code,{sourceAsOf:state.sourceAsOf,snapshotAsOf:state.snapshotAsOf,retrievedAt:state.retrievedAt}]));
  for(const [code,slug] of Object.entries({TX:"texas",NJ:"new-jersey",CA:"california",WA:"washington"})) {
    const snapshot=read(root,`lib/${slug}-intelligence/accepted-snapshot.json`);
    manifest.stateClocks[code]={sourceAsOf:typeof snapshot.source_as_of === "string" ? snapshot.source_as_of : null,sourceClockDetails:snapshot.source_as_of ?? null,snapshotAsOf:snapshot.snapshot_as_of ?? snapshot.as_of ?? null,retrievedAt:snapshot.retrieved_at ?? null};
  }
  manifest.stateClocks.FL={sourceAsOf:null,snapshotAsOf:read(root,"data/reports/fl-ins-006-state-snapshot.json").generatedAt,retrievedAt:census.retrievedAt};
  for (const metric of manifest.metrics) {
    if (metric.key==="licensed_insurance_companies") metric.label="Legal insurer identities";
    if (metric.key==="il_directors_order_observations") metric.label="Illinois Department of Insurance Director's Order observations";
    if (metric.key.includes("ny_dfs") && metric.grain==="statistical_report_directory_row") metric.grain="ny_dfs_company_directory_row";
    if (["insurance_agencies","licensed_insurance_companies","insurance_producer_records","appointing_carrier_entities","credential_observations","public_directory_listings"].includes(metric.key)) {metric.sourceAsOf=null;metric.retrievedAt=census.retrievedAt;}
  }
  // New explicit measures supplement stable legacy keys; no legacy value is used as an input.
  const legacyKeys = {
    co_statistical_report_naic_companies_tab_company_directory_rows:"co_statistical_report_naic_directory_rows",
    co_surplus_lines_eligible_identities:"co_surplus_lines_eligible_identities",
    va_statistical_report_observation_rows:"va_statistical_report_naic_directory_rows",
    ny_company_directory_directory_rows:"ny_dfs_company_directory_rows",
    il_directors_orders_observation_rows:"il_directors_order_observations",
    il_company_lookup_count:"il_authorized_companies",
  };
  for (const measure of measures) {
    measure.key=legacyKeys[measure.key] ?? measure.key;
    const at=manifest.metrics.findIndex(m=>m.key===measure.key);
    if(at<0) manifest.metrics.push(measure); else {
      const prior=manifest.metrics[at];
      measure.denominator=prior.denominator;
      measure.trace.counts=prior.trace.counts;
      measure.trace.doesNotCount=prior.trace.doesNotCount;
      if(measure.key==="co_surplus_lines_eligible_identities") measure.grain=prior.grain;
      manifest.metrics[at]=measure;
    }
  }
  const inputs=["data/home/insurance-metric-census-r2-04.json",...Object.values(paths),"data/reports/ins-home-003b-sql-lock.json","data/reports/ins-nat-012-person-loa.json","scripts/publication_metric_inputs.mjs","scripts/reconcile-network-metrics-r2-04.mjs","scripts/regen-network-metrics-from-committed.mjs"];
  inputs.push(...readdirSync(join(root,"lib")).filter(name=>name.endsWith("-intelligence")).flatMap(name=>{
    const files=readdirSync(join(root,"lib",name));
    return ["accepted-snapshot.json","publication.ts"].filter(file=>files.includes(file)).map(file=>`lib/${name}/${file}`);
  }),"data/reports/fl-ins-006-state-snapshot.json","data/reports/fl-ins-004-market-exam-census.json","data/reports/fl-ins-004-financial-exam-census.json","data/reports/ins-insurer-005b-public-ready-cohort.json","lib/national/cms-marketplace.ts","lib/national/fl-state-intel.ts");
  manifest.acceptedInputHashes=Object.fromEntries(inputs.map(p=>[p,createHash("sha256").update(readFileSync(join(root,p),"utf8").replace(/\r\n/g,"\n")).digest("hex")]));
  manifest.sourceFingerprint=createHash("sha256").update(JSON.stringify({base:manifest.sourceFingerprint,hashes:manifest.acceptedInputHashes,reconciliation:manifest.reconciliation,homepageInputs:manifest.homepageInputs},(key,value)=>(key==="generatedAt" || key==="generationDate")?undefined:value)).digest("hex");
}
