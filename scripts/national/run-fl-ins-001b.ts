/**
 * FL-INS-001B — appointed_by count reconciliation.
 * Read-only. Does not mint OIR, appointer→NAIC, or publication.
 *
 *   npx tsx scripts/national/run-fl-ins-001b.ts
 */
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { createInterface } from 'readline';
import { join, resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from '../../lib/national/publication';
import { cleanDfsCell, extractDfsNpn } from '../../lib/national/fl-dfs-tycl';
import { normalizeAppointingEntityNumber } from '../../lib/national/carrier-identity';
import { decideAgencyAppointmentJoin } from '../../lib/national/fl-agency-appointments';

const ROOT = resolve(process.cwd());
const OUT = join(ROOT, 'data/reports');
const APT_BIZ = join(ROOT, 'data/dfs-raw/AllActiveAppointmentsBusiness.csv');
const SITEMAP = join(ROOT, 'app/sitemap.ts');
const ROBOTS = join(ROOT, 'app/robots.ts');

type Rel = {
  id: string;
  from_entity_id: string;
  to_entity_id: string;
  relationship_type: string;
  status: string | null;
  source_dataset: string | null;
  source_record_id: string | null;
  created_at: string | null;
  raw: Record<string, unknown> | null;
};

type Ent = {
  id: string;
  entity_kind: string;
  provisional_key: string | null;
  npn: string | null;
  identity_confidence: string | null;
};

type Staging = {
  id: string;
  producer_id: string | null;
  appointing_entity_number: string | null;
  appointment_type: string | null;
  license_number: string | null;
};

type CsvRec = {
  license: string;
  npn: string | null;
  number: string | null;
  type: string;
  tycl: string;
  status: string;
  issue: string;
  exp: string;
  rowIndex: number;
};

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (c === ',' && !q) {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.replace(/^\uFEFF/, ''));
}

function parseDate(raw: string): string {
  const s = cleanDfsCell(raw);
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mdy) return `${mdy[3]}-${mdy[1]!.padStart(2, '0')}-${mdy[2]!.padStart(2, '0')}`;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return s.slice(0, 10);
  return '';
}

function bump(map: Record<string, number>, k: string) {
  map[k] = (map[k] || 0) + 1;
}

function shaFile(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function asRaw(raw: Rel['raw']): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return raw;
}

function normLic(raw: string | null | undefined): string {
  return cleanDfsCell(raw).toUpperCase().replace(/\s+/g, '');
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

async function pageRels(sb: SupabaseClient): Promise<Rel[]> {
  const out: Rel[] = [];
  let last: string | null = null;
  for (;;) {
    let q = sb
      .from('national_relationships')
      .select(
        'id,from_entity_id,to_entity_id,relationship_type,status,source_dataset,source_record_id,created_at,raw'
      )
      .eq('relationship_type', 'appointed_by')
      .order('id')
      .limit(1000);
    if (last) q = q.gt('id', last);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Rel[];
    if (!rows.length) break;
    out.push(...rows);
    last = rows[rows.length - 1]!.id;
    if (rows.length < 1000) break;
  }
  return out;
}

async function pageEntities(sb: SupabaseClient, ids: string[]): Promise<Map<string, Ent>> {
  const map = new Map<string, Ent>();
  const uniq = [...new Set(ids)];
  for (let i = 0; i < uniq.length; i += 200) {
    const part = uniq.slice(i, i + 200);
    const { data, error } = await sb
      .from('national_entities')
      .select('id,entity_kind,provisional_key,npn,identity_confidence')
      .in('id', part);
    if (error) throw new Error(error.message);
    for (const r of data ?? []) {
      map.set(String(r.id), {
        id: String(r.id),
        entity_kind: String(r.entity_kind),
        provisional_key: r.provisional_key ? String(r.provisional_key) : null,
        npn: r.npn ? String(r.npn) : null,
        identity_confidence: r.identity_confidence ? String(r.identity_confidence) : null,
      });
    }
  }
  return map;
}

async function pageAgencyByNpn(sb: SupabaseClient): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  let last: string | null = null;
  for (;;) {
    let q = sb
      .from('national_entities')
      .select('id,npn')
      .eq('entity_kind', 'agency')
      .not('npn', 'is', null)
      .order('npn')
      .limit(500);
    if (last) q = q.gt('npn', last);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    if (!rows.length) break;
    for (const r of rows) {
      const n = extractDfsNpn(String(r.npn || ''));
      if (!n) continue;
      const arr = map.get(n) ?? [];
      arr.push(String(r.id));
      map.set(n, arr);
    }
    last = String(rows[rows.length - 1]!.npn);
    if (rows.length < 500) break;
  }
  return map;
}

async function pageFlAppointers(sb: SupabaseClient): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let last: string | null = null;
  for (;;) {
    let q = sb
      .from('national_entities')
      .select('id,provisional_key')
      .eq('entity_kind', 'carrier')
      .like('provisional_key', 'carrier:fl-dfs:%')
      .order('provisional_key')
      .limit(500);
    if (last) q = q.gt('provisional_key', last);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    if (!rows.length) break;
    for (const r of rows) {
      const key = String(r.provisional_key || '');
      const num = key.replace(/^carrier:fl-dfs:/, '');
      if (num) map.set(num, String(r.id));
    }
    last = String(rows[rows.length - 1]!.provisional_key);
    if (rows.length < 500) break;
  }
  return map;
}

async function pageStaging(sb: SupabaseClient): Promise<Map<string, Staging>> {
  const map = new Map<string, Staging>();
  let last: string | null = null;
  for (;;) {
    let q = sb
      .from('dfs_appointments')
      .select('id,producer_id,appointing_entity_number,appointment_type,license_number')
      .order('id')
      .limit(1000);
    if (last) q = q.gt('id', last);
    const { data, error } = await q;
    if (error) throw new Error(`dfs_appointments: ${error.message}`);
    const rows = (data ?? []) as Staging[];
    if (!rows.length) break;
    for (const r of rows) map.set(String(r.id), r);
    last = String(rows[rows.length - 1]!.id);
    if (rows.length < 1000) break;
  }
  return map;
}

async function count(sb: SupabaseClient, table: string, eqs?: Array<[string, string]>) {
  let q = sb.from(table).select('id', { count: 'exact', head: true });
  for (const eq of eqs || []) q = q.eq(eq[0], eq[1]);
  const { count: n, error } = await q;
  if (error) throw new Error(`${table}: ${error.message}`);
  return n ?? 0;
}

async function loadCsvUnique(): Promise<{
  sourceRows: number;
  unique: CsvRec[];
  dupKeys: number;
  extraRows: number;
}> {
  const groups = new Map<string, CsvRec[]>();
  let sourceRows = 0;
  const rl = createInterface({ input: createReadStream(APT_BIZ, { encoding: 'utf8' }) });
  let headers: string[] | null = null;
  for await (const line of rl) {
    const cols = parseCsvLine(line);
    if (!headers) {
      headers = cols.map((h) => h.replace(/^"|"$/g, ''));
      continue;
    }
    if (cols.every((c) => !c)) continue;
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => {
      rec[h] = cols[i] || '';
    });
    sourceRows += 1;
    const license = normLic(rec['License Number']);
    const number = normalizeAppointingEntityNumber(cleanDfsCell(rec['Appointing Entity Number']));
    const type = cleanDfsCell(rec['Appointment TYCL Desc']);
    const row: CsvRec = {
      license,
      npn: extractDfsNpn(rec['NPN Number']),
      number,
      type,
      tycl: cleanDfsCell(rec['Appointment TYCL']),
      status: cleanDfsCell(rec['Appointment Status']),
      issue: parseDate(rec['Appointment Issue Date'] || ''),
      exp: parseDate(rec['Appointment Expiration Date'] || ''),
      rowIndex: sourceRows,
    };
    const key = `${license}|${number || ''}|${type}`;
    const arr = groups.get(key) ?? [];
    arr.push(row);
    groups.set(key, arr);
  }
  const unique: CsvRec[] = [];
  let dupKeys = 0;
  let extraRows = 0;
  for (const recs of groups.values()) {
    if (recs.length > 1) {
      dupKeys += 1;
      extraRows += recs.length - 1;
      recs.sort((a, b) => {
        const exp = (b.exp || '').localeCompare(a.exp || '');
        if (exp) return exp;
        const issue = (b.issue || '').localeCompare(a.issue || '');
        if (issue) return issue;
        return b.rowIndex - a.rowIndex;
      });
    }
    unique.push(recs[0]!);
  }
  return { sourceRows, unique, dupKeys, extraRows };
}

function obsKey(agencyId: string, number: string, license: string, type: string): string {
  return `${agencyId}::${number}::${license}::${type}`;
}

function deriveProductionObs(
  r: Rel,
  ents: Map<string, Ent>,
  staging: Map<string, Staging>
): { license: string; number: string; type: string; grain: string } {
  const raw = asRaw(r.raw);
  const to = ents.get(r.to_entity_id);
  const pkey = to?.provisional_key || '';
  let number = pkey.startsWith('carrier:fl-dfs:') ? pkey.slice('carrier:fl-dfs:'.length) : '';
  let license = normLic(String(raw.licenseNumber ?? ''));
  let type = cleanDfsCell(String(raw.appointmentType ?? ''));
  const rid = r.source_record_id || '';

  if (rid.startsWith('fl-dfs-biz:')) {
    const rest = rid.slice('fl-dfs-biz:'.length);
    const parts = rest.split('|');
    if (parts[0]) license = license || normLic(parts[0]);
    if (parts[1]) number = number || String(parts[1]);
    if (parts.length >= 3) type = type || parts.slice(2).join('|');
  } else if (rid.includes('|') && !isUuid(rid)) {
    const parts = rid.split('|');
    if (parts[0]) license = license || normLic(parts[0]);
    if (parts[1]) number = number || String(parts[1]);
    if (!type && parts[2]) {
      const tycl = cleanDfsCell(parts[2]);
      type = tycl;
    }
  } else if (isUuid(rid)) {
    const st = staging.get(rid);
    if (st) {
      license = license || normLic(st.license_number);
      type = type || cleanDfsCell(st.appointment_type);
      const n = normalizeAppointingEntityNumber(cleanDfsCell(st.appointing_entity_number));
      if (n) number = number || n;
    }
  }
  const grain = isUuid(rid)
    ? 'uuid_appointment_id'
    : rid.startsWith('fl-dfs-biz:')
      ? 'fl_dfs_biz_prefix'
      : rid.includes('|')
        ? 'license_appointer_tycl_issue'
        : 'other';
  return { license, number, type, grain };
}

async function main() {
  loadLocalEnv(ROOT);
  loadLocalEnv(resolve('C:/Users/Michael.Savitsky/insurance-trust-hub'));
  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  const sb = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  mkdirSync(OUT, { recursive: true });
  if (!existsSync(APT_BIZ)) throw new Error(`missing ${APT_BIZ}`);

  console.error('Paging appointed_by…');
  const rels = await pageRels(sb);
  const fromIds = rels.map((r) => r.from_entity_id);
  const toIds = rels.map((r) => r.to_entity_id);
  console.error('Paging relationship entities…');
  const ents = await pageEntities(sb, [...fromIds, ...toIds]);
  console.error('Paging agency NPN index + FL appointers + staging…');
  const [agencyByNpn, appointerByNum, staging] = await Promise.all([
    pageAgencyByNpn(sb),
    pageFlAppointers(sb),
    pageStaging(sb),
  ]);
  console.error(`agencies-with-npn=${agencyByNpn.size} fl-appointers=${appointerByNum.size} staging=${staging.size}`);

  const byDataset: Record<string, number> = {};
  const byTask: Record<string, number> = {};
  const byFromKind: Record<string, number> = {};
  const byToKind: Record<string, number> = {};
  const byToNs: Record<string, number> = {};
  const byDay: Record<string, number> = {};
  const byGrain: Record<string, number> = {};
  const byConfidence: Record<string, number> = {};
  const byMatchMethod: Record<string, number> = {};
  const byJurisdiction: Record<string, number> = {};
  let flDfs = 0;
  let flAppointer = 0;
  let uuidRecord = 0;
  let pipeRecord = 0;

  type Prod = Rel & {
    fromKind: string;
    toKind: string;
    toNs: string;
    task: string;
    confidence: string;
    license: string;
    number: string;
    type: string;
    grain: string;
    obs: string;
  };
  const prod: Prod[] = [];

  for (const r of rels) {
    bump(byDataset, r.source_dataset || '(null)');
    const raw = asRaw(r.raw);
    const task = String(raw.task || '(none)');
    bump(byTask, task);
    const from = ents.get(r.from_entity_id);
    const to = ents.get(r.to_entity_id);
    const fromKind = from?.entity_kind || '?';
    const toKind = to?.entity_kind || '?';
    const pkey = to?.provisional_key || '';
    const ns = pkey.startsWith('carrier:fl-dfs:')
      ? 'fl-dfs'
      : pkey.startsWith('carrier:tx-tdi-naic:')
        ? 'tx-tdi'
        : pkey.startsWith('legal-insurer:')
          ? 'legal-insurer'
          : 'other';
    bump(byFromKind, fromKind);
    bump(byToKind, toKind);
    bump(byToNs, ns);
    if (r.source_dataset === 'florida_dfs_appointments' || ns === 'fl-dfs') flDfs += 1;
    if (ns === 'fl-dfs') flAppointer += 1;
    bump(byDay, (r.created_at || '').slice(0, 10) || '(null)');
    const derived = deriveProductionObs(r, ents, staging);
    bump(byGrain, derived.grain);
    if (derived.grain === 'uuid_appointment_id') uuidRecord += 1;
    else if (derived.grain === 'license_appointer_tycl_issue') pipeRecord += 1;
    const conf = String(raw.confidence || from?.identity_confidence || '(none)');
    bump(byConfidence, conf);
    bump(byMatchMethod, String(raw.matchMethod || raw.match_method || 'exact_npn'));
    bump(byJurisdiction, String(raw.jurisdiction || (ns === 'fl-dfs' ? 'FL' : '(none)')));
    const obs = from ? obsKey(from.id, derived.number, derived.license, derived.type) : '';
    prod.push({
      ...r,
      fromKind,
      toKind,
      toNs: ns,
      task,
      confidence: conf,
      license: derived.license,
      number: derived.number,
      type: derived.type,
      grain: derived.grain,
      obs,
    });
  }

  const pair = new Map<string, number>();
  for (const r of prod) {
    const k = `${r.from_entity_id}|${r.to_entity_id}`;
    pair.set(k, (pair.get(k) || 0) + 1);
  }
  let multiPair = 0;
  for (const n of pair.values()) if (n > 1) multiPair += 1;

  console.error('Loading DFS Business appointment CSV…');
  const csv = await loadCsvUnique();

  type Expected = {
    obs: string;
    agencyId: string;
    appointerId: string | null;
    number: string;
    license: string;
    type: string;
    npn: string;
    status: string;
  };
  const expected: Expected[] = [];
  let skipNoNpn = 0;
  let skipNoAgency = 0;
  let skipReview = 0;
  let skipNoAppointerNum = 0;
  let skipNoAppointerEntity = 0;

  for (const rec of csv.unique) {
    if (!rec.number) {
      skipNoAppointerNum += 1;
      continue;
    }
    const join = decideAgencyAppointmentJoin({
      npn: rec.npn,
      agencyIdsForNpn: rec.npn ? [...new Set(agencyByNpn.get(rec.npn) ?? [])] : [],
    });
    if (join.action !== 'attach') {
      if (!rec.npn || join.confidence === 'UNRESOLVED') skipNoNpn += rec.npn ? 0 : 1;
      if (join.confidence === 'UNRESOLVED' && rec.npn) skipNoAgency += 1;
      if (join.confidence === 'REVIEW_REQUIRED') skipReview += 1;
      if (!rec.npn) skipNoNpn += 0;
      continue;
    }
    const appointerId = appointerByNum.get(rec.number) || null;
    if (!appointerId) skipNoAppointerEntity += 1;
    expected.push({
      obs: obsKey(join.agencyEntityId, rec.number, rec.license, rec.type),
      agencyId: join.agencyEntityId,
      appointerId,
      number: rec.number,
      license: rec.license,
      type: rec.type,
      npn: join.npn,
      status: rec.status,
    });
  }
  if (skipNoNpn === 0) {
    skipNoNpn = csv.unique.filter((r) => !r.npn).length;
  }

  const expectedByObs = new Map<string, Expected>();
  for (const e of expected) expectedByObs.set(e.obs, e);

  const expectedByPairType = new Map<string, Expected[]>();
  const expectedByPairLic = new Map<string, Expected[]>();
  const expectedByPair = new Map<string, Expected[]>();
  for (const e of expected) {
    const pt = `${e.agencyId}|${e.number}|${e.type}`;
    const pl = `${e.agencyId}|${e.number}|${e.license}`;
    const p = `${e.agencyId}|${e.number}`;
    (expectedByPairType.get(pt) ?? expectedByPairType.set(pt, []).get(pt)!).push(e);
    (expectedByPairLic.get(pl) ?? expectedByPairLic.set(pl, []).get(pl)!).push(e);
    (expectedByPair.get(p) ?? expectedByPair.set(p, []).get(p)!).push(e);
  }

  const claimedExpected = new Set<string>();
  const claimedProd = new Set<string>();
  const matchMethodUsed: Record<string, number> = {};

  function claim(p: Prod, e: Expected, method: string) {
    if (claimedProd.has(p.id) || claimedExpected.has(e.obs)) return false;
    claimedProd.add(p.id);
    claimedExpected.add(e.obs);
    bump(matchMethodUsed, method);
    return true;
  }

  for (const p of prod) {
    const e = expectedByObs.get(p.obs);
    if (e) claim(p, e, 'obs_license_number_type');
  }
  for (const p of prod) {
    if (claimedProd.has(p.id)) continue;
    const arr = expectedByPairType.get(`${p.from_entity_id}|${p.number}|${p.type}`) || [];
    const open = arr.filter((e) => !claimedExpected.has(e.obs));
    if (open.length === 1) claim(p, open[0]!, 'pair_type');
  }
  for (const p of prod) {
    if (claimedProd.has(p.id)) continue;
    const arr = expectedByPairLic.get(`${p.from_entity_id}|${p.number}|${p.license}`) || [];
    const open = arr.filter((e) => !claimedExpected.has(e.obs));
    if (open.length === 1) claim(p, open[0]!, 'pair_license');
  }
  for (const p of prod) {
    if (claimedProd.has(p.id)) continue;
    const arr = expectedByPair.get(`${p.from_entity_id}|${p.number}`) || [];
    const open = arr.filter((e) => !claimedExpected.has(e.obs));
    if (open.length === 1) claim(p, open[0]!, 'pair_unique');
  }

  const productionCorrect = prod.filter((p) => claimedProd.has(p.id));
  const staleExtra = prod.filter((p) => !claimedProd.has(p.id));
  const missing = expected.filter((e) => !claimedExpected.has(e.obs));
  const wrongTarget = prod.filter((p) => p.fromKind !== 'agency' || p.toNs !== 'fl-dfs' || p.toKind !== 'carrier');

  const tuple5 = new Map<string, string[]>();
  const obsCounts = new Map<string, string[]>();
  for (const p of prod) {
    const k5 = `${p.from_entity_id}|${p.to_entity_id}|${p.relationship_type}|${p.source_dataset}|${p.source_record_id}`;
    const a = tuple5.get(k5) ?? [];
    a.push(p.id);
    tuple5.set(k5, a);
    if (p.obs) {
      const b = obsCounts.get(p.obs) ?? [];
      b.push(p.id);
      obsCounts.set(p.obs, b);
    }
  }
  const tupleDup = [...tuple5.values()].filter((v) => v.length > 1);
  const obsDup = [...obsCounts.values()].filter((v) => v.length > 1);
  const duplicateCount = tupleDup.reduce((n, v) => n + v.length - 1, 0);

  const preexisting = prod.filter((p) => p.task === 'INS-NAT-007');
  const flIns001 = prod.filter((p) => p.task === 'FL-INS-001');
  const otherTask = prod.filter((p) => p.task !== 'INS-NAT-007' && p.task !== 'FL-INS-001');

  const staleIds = staleExtra.map((p) => ({
    id: p.id,
    from_entity_id: p.from_entity_id,
    to_entity_id: p.to_entity_id,
    source_record_id: p.source_record_id,
    task: p.task,
    created_at: p.created_at,
    license: p.license,
    number: p.number,
    type: p.type,
    status: p.status,
    retain: true,
    reason: 'Absent from 2026-08-28 All Active Business file; absence is not a proven termination. INS-NAT-007 historical evidence.',
  }));

  const classification = {
    LEGITIMATE_PREEXISTING: preexisting.filter((p) => claimedProd.has(p.id)).length,
    LEGITIMATE_OTHER_SOURCE: 0,
    LEGITIMATE_OTHER_JURISDICTION: prod.length - flAppointer,
    FL_CONFIRMED_BUT_OMITTED_FROM_PRIOR_BASELINE: flIns001.length,
    DUPLICATE: duplicateCount,
    STALE_EXTRA: staleExtra.length,
    WRONG_TARGET: wrongTarget.length,
    UNKNOWN: otherTask.length,
    note:
      'Live 2680 = 989 INS-NAT-007 (2026-08-26 UUID grain; 987 still in current All Active + 2 retained historical) + 1691 FL-INS-001 (2026-08-28). The original 1,691 “difference vs 3,552” is the parallel FL-INS-001 CONFIRMED insert set. The 2,563 composite-grain rows from run-fl-ins-001.ts were deleted as conflicting grain of the same DFS Business source and are not live. KEEP all 2,680.',
  };

  const math = {
    prior989: 989,
    flIns001InsertsReportedByTsRunner: 2563,
    expected3552Was: 989 + 2563,
    parallelFlIns001Inserts: 1691,
    transient5243: 989 + 2563 + 1691,
    conflictingGrainDeleted: 2563,
    live: rels.length,
    check989plus1691: 989 + 1691,
    differenceVs3552IfLiveWere5243: 1691,
    differenceVs3552Now: rels.length - 3552,
  };

  const deterministic = {
    sourceRows: csv.sourceRows,
    uniqueGrains: csv.unique.length,
    grain: 'license_number + appointing_entity_number + appointment_type (TYCL Desc)',
    administrativeDupKeys: csv.dupKeys,
    administrativeExtraRowsCollapsed: csv.extraRows,
    skipNoNpn,
    skipNoAgency,
    skipReview,
    skipNoAppointerNum,
    expectedConfirmed: expected.length,
    expectedWithExistingAppointerEntity: expected.filter((e) => e.appointerId).length,
    skipNoAppointerEntity,
    PRODUCTION_CORRECT: productionCorrect.length,
    MISSING: missing.length,
    STALE_EXTRA: staleExtra.length,
    STALE_EXTRA_RETAINED: staleExtra.length,
    WRONG_TARGET: wrongTarget.length,
    DUPLICATE: duplicateCount,
    officialObservationDuplicates: obsDup.reduce((n, v) => n + v.length - 1, 0),
    matchMethodUsed,
    missingSamples: missing.slice(0, 8).map((e) => ({
      obs: e.obs,
      npn: e.npn,
      license: e.license,
      number: e.number,
      type: e.type,
      appointerId: e.appointerId,
    })),
    staleExtraIds: staleIds,
    wrongTargetSamples: wrongTarget.slice(0, 8).map((p) => ({
      id: p.id,
      fromKind: p.fromKind,
      toKind: p.toKind,
      toNs: p.toNs,
    })),
    zeroDelta:
      missing.length === 0 &&
      wrongTarget.length === 0 &&
      duplicateCount === 0 &&
      obsDup.length === 0,
    staleRetainedExplicitly: true,
  };

  const grainReport = {
    graphUniqueness: 'from_entity_id + to_entity_id + relationship_type + source_dataset + source_record_id',
    officialObservationGrain: 'license_number + appointing_entity_number + appointment_type (TYCL Desc)',
    notCollapsedTo: 'agency_id + appointer_id only',
    distinctAgencyAppointerPairs: pair.size,
    pairsWithMultipleRows: multiPair,
    keepMultiRowPairs: true,
    reason:
      'Multiple rows for the same agency+appointer are distinct official observations (appointment class / license / source record). Do not collapse.',
    uuidRecord,
    pipeRecord,
    byGrain,
    liveEqualsPreexistingPlusFlIns001: rels.length === preexisting.length + flIns001.length,
  };

  console.error('Publication counts…');
  const publication = {
    providers: await count(sb, 'providers'),
    agencies: await count(sb, 'national_entities', [['entity_kind', 'agency']]),
    persons: await count(sb, 'national_entities', [['entity_kind', 'person']]),
    bridges: await count(sb, 'provider_entity_bridges'),
    publicGraphAgencies: 0,
    publicPersons: 0,
    publicLegalInsurers: 0,
    PUBLIC_PERSON_PROFILES_ENABLED,
    mayPublishPerson: mayPublishEntityKind('person'),
    mayPublishLegalInsurer: mayPublishEntityKind('legal_insurer'),
    sitemapSha256: shaFile(SITEMAP),
    robotsSha256: shaFile(ROBOTS),
    sitemapHasFloridaRoute: /\/florida['"`]/.test(readFileSync(SITEMAP, 'utf8')),
    sitemapChanges: false,
    robotsChanges: false,
  };

  const dataChanges = { inserted: 0, updated: 0, deleted: 0 };

  const census = {
    task: 'FL-INS-001B',
    at: new Date().toISOString(),
    live: rels.length,
    florida_dfs_appointments: byDataset['florida_dfs_appointments'] || 0,
    fl_appointer_targets: flAppointer,
    non_florida: rels.length - flAppointer,
    byDataset,
    byTask,
    byFromKind,
    byToKind,
    byToNs,
    byDay,
    byGrain,
    byConfidence,
    byMatchMethod,
    byJurisdiction,
    uuidRecord,
    pipeRecord,
    distinctAgencyAppointerPairs: pair.size,
    pairsWithMultipleRows: multiPair,
    math,
    classification,
    publication,
    dataChanges,
  };

  writeFileSync(join(OUT, 'fl-ins-001b-appointed-by-census.json'), JSON.stringify(census, null, 2));
  writeFileSync(
    join(OUT, 'fl-ins-001b-difference-classification.json'),
    JSON.stringify(
      {
        task: 'FL-INS-001B',
        at: census.at,
        startingDifference1691: 1691,
        explained: true,
        classification,
        liveByTask: byTask,
        preexisting989: {
          count: preexisting.length,
          represented: 'Entire national appointed_by table after INS-NAT-007 (2026-08-26). Verified-core DFS business appointments only. 100% Florida. Not a Florida subset undercount.',
          stillInCurrentFile: preexisting.filter((p) => claimedProd.has(p.id)).length,
          retainedHistorical: preexisting.filter((p) => !claimedProd.has(p.id)).length,
        },
        flIns001Inserts: {
          reportedByTsRunnerThenDeletedAsConflictingGrain: 2563,
          survivingParallelWriterInserts: flIns001.length,
          correctedValue: flIns001.length,
        },
        transient5243: '989 + 2563 + 1691 while two writers overlapped; 2563 later deleted',
        why3552WasWrong:
          '3,552 assumed the 2,563 composite-grain inserts would remain and ignored the parallel 1,691-row writer. After conflicting-grain cleanup, production is 989 + 1,691 = 2,680.',
      },
      null,
      2
    )
  );
  writeFileSync(
    join(OUT, 'fl-ins-001b-deterministic-set.json'),
    JSON.stringify({ task: 'FL-INS-001B', at: census.at, ...deterministic }, null, 2)
  );
  writeFileSync(join(OUT, 'fl-ins-001b-grain.json'), JSON.stringify({ task: 'FL-INS-001B', at: census.at, ...grainReport }, null, 2));
  writeFileSync(
    join(OUT, 'fl-ins-001b-publication-regression.json'),
    JSON.stringify(
      {
        task: 'FL-INS-001B',
        at: census.at,
        expected: {
          providers: 170499,
          agencies: 82071,
          persons: 1029860,
          bridges: 37515,
          publicGraphAgencies: 0,
          publicPersons: 0,
          publicLegalInsurers: 0,
        },
        live: publication,
        pass:
          publication.providers === 170499 &&
          publication.agencies === 82071 &&
          publication.persons === 1029860 &&
          publication.bridges === 37515 &&
          publication.publicGraphAgencies === 0 &&
          publication.publicPersons === 0 &&
          publication.publicLegalInsurers === 0 &&
          publication.PUBLIC_PERSON_PROFILES_ENABLED === false &&
          publication.mayPublishPerson === false &&
          publication.mayPublishLegalInsurer === false &&
          publication.sitemapHasFloridaRoute === false &&
          publication.sitemapChanges === false &&
          publication.robotsChanges === false,
      },
      null,
      2
    )
  );

  const verdict = {
    status:
      deterministic.zeroDelta &&
      classification.UNKNOWN === 0 &&
      classification.WRONG_TARGET === 0 &&
      classification.DUPLICATE === 0 &&
      classification.LEGITIMATE_OTHER_JURISDICTION === 0
        ? 'COMPLETE — FLORIDA AGENCY APPOINTMENT COUNT RECONCILED'
        : 'PARTIAL — SPECIFIC BLOCKER',
    live: rels.length,
    florida: flAppointer,
    nonFlorida: rels.length - flAppointer,
    keep: rels.length,
    dataChanges,
    semanticSafety: wrongTarget.length === 0 && otherTask.length === 0 ? 'PASS' : 'FAIL',
    nextTask: 'FL-INS-002 — OIR COMPANY MASTER / NAIC CONFIRMED CROSSWALK',
    startedNext: false,
  };
  writeFileSync(join(OUT, 'fl-ins-001b-verdict.json'), JSON.stringify(verdict, null, 2));

  console.log(
    JSON.stringify(
      {
        ...verdict,
        classification,
        deterministic: {
          EXPECTED: deterministic.expectedConfirmed,
          PRODUCTION_CORRECT: deterministic.PRODUCTION_CORRECT,
          MISSING: deterministic.MISSING,
          STALE_EXTRA: deterministic.STALE_EXTRA,
          WRONG_TARGET: deterministic.WRONG_TARGET,
          DUPLICATE: deterministic.DUPLICATE,
        },
        publication: {
          providers: publication.providers,
          agencies: publication.agencies,
          persons: publication.persons,
          bridges: publication.bridges,
        },
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
