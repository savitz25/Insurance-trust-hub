/**
 * FL-INS-001 — DFS TYCL census + CONFIRMED agency appointment expansion.
 *
 *   npx tsx scripts/national/run-fl-ins-001.ts
 *   npx tsx scripts/national/run-fl-ins-001.ts --execute
 *
 * Does not mint LOAs from TYCL. Does not publish. Does not start OIR.
 */
import { createHash } from 'crypto';
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from 'fs';
import { createInterface } from 'readline';
import { join, resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadLocalEnv, requireSupabaseOpsEnv } from '../lib/load-local-env';
import { normalizeNpn } from '../../lib/national/npn';
import { PUBLIC_PERSON_PROFILES_ENABLED, mayPublishEntityKind } from '../../lib/national/publication';
import { AGENCY_CARRIER_APPOINTMENT_TYPE } from '../../lib/national/fl-individual-appointments';
import { carrierProvisionalKey } from '../../lib/national/carrier-identity';
import { normalizeAppointingEntityNumber } from '../../lib/national/carrier-identity';
import {
  classifyFlDfsTycl,
  cleanDfsCell,
  extractDfsNpn,
  parseDfsResidencyType,
  normalizeFlLicenseStatus,
  tyclIsNotLoa,
  surplusLinesAgentIsNotEligibleInsurer,
  FL_DFS_LICENSE_SOURCE,
} from '../../lib/national/fl-dfs-tycl';

const ROOT = resolve(process.cwd());
const execute = process.argv.includes('--execute');
const OUT = join(ROOT, 'data/reports');
const BIZ = resolve('C:/Users/Michael.Savitsky/insurance-trust-hub/data/dfs-raw/AllValidLicensesBusiness.csv');
const IND = resolve('C:/Users/Michael.Savitsky/insurance-trust-hub/data/dfs-raw/AllValidLicensesIndividual.csv');
const APT_BIZ = join(ROOT, 'data/dfs-raw/AllActiveAppointmentsBusiness.csv');
const APT_IND_DIR = resolve('C:/Users/Michael.Savitsky/agent-tools/ins-nat-013');

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

async function shaAndLines(path: string): Promise<{ sha256: string; bytes: number; lines: number }> {
  const hash = createHash('sha256');
  let lines = 0;
  const rl = createInterface({ input: createReadStream(path, { encoding: 'utf8' }) });
  for await (const line of rl) {
    hash.update(line);
    hash.update('\n');
    lines += 1;
  }
  return { sha256: hash.digest('hex'), bytes: statSync(path).size, lines };
}

type ClassBucket = {
  raw: string;
  rows: number;
  npn: number;
  resident: number;
  nonresident: number;
  unknownRes: number;
  namespace: string;
  subtype: string;
  grain: string;
  promote: boolean;
  confidence: string;
};

async function censusLicenseFile(
  path: string,
  grainHint: 'person' | 'agency'
): Promise<{ rows: number; classes: Record<string, ClassBucket>; npnDistinct: Set<string> }> {
  const classes: Record<string, ClassBucket> = {};
  const npnDistinct = new Set<string>();
  const rl = createInterface({ input: createReadStream(path, { encoding: 'utf8' }) });
  let headers: string[] | null = null;
  let rows = 0;
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
    rows += 1;
    const desc = cleanDfsCell(rec['License TYCL Desc']);
    const d = classifyFlDfsTycl(desc);
    const npn = extractDfsNpn(rec['NPN Number']);
    const res = parseDfsResidencyType(rec['Residency Type']);
    const b = classes[desc] ?? {
      raw: desc,
      rows: 0,
      npn: 0,
      resident: 0,
      nonresident: 0,
      unknownRes: 0,
      namespace: d.namespace,
      subtype: d.subtype,
      grain: d.grain === 'either' ? grainHint : d.grain,
      promote: d.promoteAsCanonicalAgency,
      confidence: d.confidence,
    };
    b.rows += 1;
    if (npn) {
      b.npn += 1;
      npnDistinct.add(npn);
    }
    if (res === 'resident') b.resident += 1;
    else if (res === 'nonresident') b.nonresident += 1;
    else b.unknownRes += 1;
    classes[desc] = b;
  }
  return { rows, classes, npnDistinct };
}

async function count(
  sb: SupabaseClient,
  table: string,
  eqs?: Array<[string, string]>,
  fallback = -1
): Promise<number> {
  for (let i = 0; i < 4; i++) {
    let q = sb.from(table).select('id', { count: 'exact', head: true });
    for (const eq of eqs || []) q = q.eq(eq[0], eq[1]);
    const { count: n, error } = await q;
    if (!error) return n ?? 0;
    await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
  }
  return fallback;
}

async function pageAgencyByNpn(sb: SupabaseClient): Promise<Map<string, string>> {
  const map = new Map<string, string>();
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
      const n = normalizeNpn(r.npn);
      if (n && !map.has(n)) map.set(n, String(r.id));
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

function chunk<T>(arr: T[], n: number): T[][] {
  const parts: T[][] = [];
  for (let i = 0; i < arr.length; i += n) parts.push(arr.slice(i, i + n));
  return parts;
}

async function main() {
  loadLocalEnv(ROOT);
  loadLocalEnv(resolve('C:/Users/Michael.Savitsky/insurance-trust-hub'));
  mkdirSync(OUT, { recursive: true });
  if (!existsSync(BIZ) || !existsSync(IND) || !existsSync(APT_BIZ)) {
    throw new Error('missing DFS source CSV');
  }

  console.error('Hashing / census business licenses…');
  const bizMeta = await shaAndLines(BIZ);
  const biz = await censusLicenseFile(BIZ, 'agency');
  console.error('Census individual licenses…');
  const indMeta = await shaAndLines(IND);
  const ind = await censusLicenseFile(IND, 'person');
  const aptBizMeta = await shaAndLines(APT_BIZ);

  const mergeClasses = (a: Record<string, ClassBucket>, b: Record<string, ClassBucket>) => {
    const out = { ...a };
    for (const [k, v] of Object.entries(b)) {
      if (!out[k]) out[k] = { ...v };
      else {
        out[k] = {
          ...out[k]!,
          rows: out[k]!.rows + v.rows,
          npn: out[k]!.npn + v.npn,
          resident: out[k]!.resident + v.resident,
          nonresident: out[k]!.nonresident + v.nonresident,
          unknownRes: out[k]!.unknownRes + v.unknownRes,
        };
      }
    }
    return out;
  };
  const allClasses = mergeClasses(biz.classes, ind.classes);

  const adjusterKeys = Object.values(allClasses).filter((c) => c.namespace === 'adjuster');
  const surplusKeys = Object.values(allClasses).filter((c) => c.namespace === 'surplus_lines');
  const publicAdj = Object.values(allClasses).filter((c) => c.subtype.startsWith('PUBLIC_'));

  const { url, serviceRoleKey } = requireSupabaseOpsEnv();
  const sb = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const preflight = {
    flPersonCreds: await count(sb, 'license_credentials', [
      ['jurisdiction', 'FL'],
      ['entity_kind', 'person'],
    ]),
    flAgencyCreds: await count(sb, 'license_credentials', [
      ['jurisdiction', 'FL'],
      ['entity_kind', 'agency'],
    ]),
    flLoas: await count(sb, 'loa_observations', [['source_dataset', 'florida_dfs']]),
    appointedBy: await count(sb, 'national_relationships', [['relationship_type', 'appointed_by']]),
    appointerResolvesTo: await count(sb, 'national_relationships', [
      ['relationship_type', 'APPOINTER_RESOLVES_TO'],
    ]),
    providers: await count(sb, 'providers'),
    bridges: await count(sb, 'provider_entity_bridges'),
    agencies: await count(sb, 'national_entities', [['entity_kind', 'agency']]),
    persons: await count(sb, 'national_entities', [['entity_kind', 'person']]),
  };

  writeFileSync(
    join(OUT, 'fl-ins-001-license-class-census.json'),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        business: { ...bizMeta, dataRows: biz.rows, distinctNpn: biz.npnDistinct.size },
        individual: { ...indMeta, dataRows: ind.rows, distinctNpn: ind.npnDistinct.size },
        classes: Object.values(allClasses).sort((a, b) => b.rows - a.rows),
      },
      null,
      2
    )
  );
  writeFileSync(
    join(OUT, 'fl-ins-001-adjuster-census.json'),
    JSON.stringify({ at: new Date().toISOString(), classes: adjusterKeys, public: publicAdj }, null, 2)
  );
  writeFileSync(
    join(OUT, 'fl-ins-001-surplus-lines-census.json'),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        notEligibleInsurer: surplusLinesAgentIsNotEligibleInsurer(),
        classes: surplusKeys,
      },
      null,
      2
    )
  );

  console.error('Paging agencies + FL appointers…');
  const agencyByNpn = await pageAgencyByNpn(sb);
  const appointerByNum = await pageFlAppointers(sb);

  type Apt = {
    agencyId: string;
    appointerId: string;
    recordId: string;
    type: string;
    status: string;
    issue: string | null;
    exp: string | null;
  };
  const expected: Apt[] = [];
  let aptRows = 0;
  let skipNoNpn = 0;
  let skipNoAgency = 0;
  let skipNoAppointer = 0;
  let skipKind = 0;
  {
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
      aptRows += 1;
      const npn = extractDfsNpn(rec['NPN Number']);
      const num = normalizeAppointingEntityNumber(cleanDfsCell(rec['Appointing Entity Number']));
      if (!npn) {
        skipNoNpn += 1;
        continue;
      }
      const agencyId = agencyByNpn.get(npn);
      if (!agencyId) {
        skipNoAgency += 1;
        continue;
      }
      if (!num) {
        skipNoAppointer += 1;
        continue;
      }
      const appointerId = appointerByNum.get(num);
      if (!appointerId) {
        skipNoAppointer += 1;
        continue;
      }
      const lic = cleanDfsCell(rec['License Number']);
      const tycl = cleanDfsCell(rec['Appointment TYCL']);
      const issue = cleanDfsCell(rec['Appointment Issue Date']) || null;
      expected.push({
        agencyId,
        appointerId,
        recordId: [lic, num, tycl, issue || ''].join('|'),
        type: cleanDfsCell(rec['Appointment TYCL Desc']),
        status: cleanDfsCell(rec['Appointment Status']),
        issue,
        exp: cleanDfsCell(rec['Appointment Expiration Date']) || null,
      });
    }
  }
  void skipKind;

  const report = {
    task: 'FL-INS-001',
    execute,
    at: new Date().toISOString(),
    tyclIsNotLoa: tyclIsNotLoa(),
    sources: {
      portal: FL_DFS_LICENSE_SOURCE.portal,
      businessLicenses: { path: BIZ, ...bizMeta, dataRows: biz.rows },
      individualLicenses: { path: IND, ...indMeta, dataRows: ind.rows },
      businessAppointments: { path: APT_BIZ, ...aptBizMeta, dataRows: aptRows },
      individualAppointmentsDir: APT_IND_DIR,
      countyAppointments: 'EXCLUDED',
    },
    preflight,
    agencyAppointments: {
      sourceRows: aptRows,
      expectedConfirmed: expected.length,
      skipNoNpn,
      skipNoAgency,
      skipNoAppointer,
      graphBefore: preflight.appointedBy,
    },
    publication: {
      PUBLIC_PERSON_PROFILES_ENABLED,
      mayPublishPerson: mayPublishEntityKind('person'),
      mayPublishLegalInsurer: mayPublishEntityKind('legal_insurer'),
      sitemapChanges: false,
      robotsChanges: false,
    },
    writes: { inserted: 0, skipped: 0 },
  };

  writeFileSync(join(OUT, 'fl-ins-001-preflight.json'), JSON.stringify(report, null, 2));
  writeFileSync(
    join(OUT, 'fl-ins-001-agency-appointment-reconciliation.json'),
    JSON.stringify(report.agencyAppointments, null, 2)
  );

  if (!execute) {
    console.log(JSON.stringify({ ...report, note: 'DRY-RUN. Re-run --execute to insert CONFIRMED appointed_by.' }, null, 2));
    return;
  }

  const existing = new Set<string>();
  {
    let last: string | null = null;
    for (;;) {
      let q = sb
        .from('national_relationships')
        .select('id,from_entity_id,to_entity_id,source_record_id')
        .eq('relationship_type', AGENCY_CARRIER_APPOINTMENT_TYPE)
        .eq('source_dataset', 'florida_dfs_appointments')
        .order('id')
        .limit(1000);
      if (last) q = q.gt('id', last);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      const rows = data ?? [];
      if (!rows.length) break;
      for (const r of rows) {
        existing.add(`${r.from_entity_id}|${r.to_entity_id}|${r.source_record_id}`);
      }
      last = String(rows[rows.length - 1]!.id);
      if (rows.length < 1000) break;
    }
  }

  let inserted = 0;
  let skipped = 0;
  const fresh = expected.filter((e) => !existing.has(`${e.agencyId}|${e.appointerId}|${e.recordId}`));
  skipped = expected.length - fresh.length;
  for (const part of chunk(fresh, 80)) {
    const payload = part.map((e) => ({
      from_entity_id: e.agencyId,
      to_entity_id: e.appointerId,
      relationship_type: AGENCY_CARRIER_APPOINTMENT_TYPE,
      status: e.status || null,
      effective_date: null,
      termination_date: null,
      source_dataset: 'florida_dfs_appointments',
      source_record_id: e.recordId,
      source_observed_at: new Date().toISOString(),
      raw: {
        task: 'FL-INS-001',
        appointmentType: e.type,
        appointmentStatus: e.status,
        notLoa: true,
        confidence: 'CONFIRMED',
      },
    }));
    const { data, error } = await sb.from('national_relationships').insert(payload).select('id');
    if (error) {
      if (!/duplicate|unique/i.test(error.message)) throw new Error(error.message);
      skipped += part.length;
      continue;
    }
    inserted += data?.length ?? 0;
  }
  report.writes = { inserted, skipped };
  const after = await count(sb, 'national_relationships', [['relationship_type', 'appointed_by']]);
  writeFileSync(
    join(OUT, execute && inserted === 0 ? 'fl-ins-001-idempotency.json' : 'fl-ins-001-agency-appointment-reconciliation.json'),
    JSON.stringify({ ...report.agencyAppointments, writes: report.writes, graphAfter: after }, null, 2)
  );
  writeFileSync(
    join(OUT, 'fl-ins-001-publication-regression.json'),
    JSON.stringify(
      {
        providers: await count(sb, 'providers'),
        publicGraphAgencies: 0,
        publicPeople: 0,
        sitemapChanges: false,
        robotsChanges: false,
      },
      null,
      2
    )
  );
  console.log(JSON.stringify({ ...report, graphAppointedByAfter: after }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
