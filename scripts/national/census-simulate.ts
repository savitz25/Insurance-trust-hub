/**
 * INS-NAT-004 dry-run identity census. No DB writes.
 *   npx tsx scripts/national/census-simulate.ts
 */
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { NationalGraph } from '../../lib/national/graph';
import { normalizeNpn } from '../../lib/national/npn';
import { compareLegalNames } from '../../lib/national/names';
import { resolveLicenseNamespace } from '../../lib/national/credential-namespace';
import { computeNpnCensus } from '../../lib/national/census';
import type { SourceCredentialInput } from '../../lib/national/types';

const JSONL =
  process.env.INS_NAT_004_JSONL ||
  'C:/Users/Michael.Savitsky/agent-tools/ins-nat-004-staging.jsonl';

type Raw = SourceCredentialInput & {
  sourceTable?: string;
  licenseTypes?: string[] | null;
  phone?: string | null;
  email?: string | null;
  physicalAddress?: string | null;
};

async function load(path: string): Promise<Raw[]> {
  const rows: Raw[] = [];
  const rl = createInterface({ input: createReadStream(path, 'utf8'), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    rows.push(JSON.parse(line) as Raw);
  }
  return rows;
}

function dist(counts: number[]) {
  const buckets = { 1: 0, 2: 0, 3: 0, '4-5': 0, '6-10': 0, '11+': 0 };
  for (const n of counts) {
    if (n === 1) buckets[1] += 1;
    else if (n === 2) buckets[2] += 1;
    else if (n === 3) buckets[3] += 1;
    else if (n <= 5) buckets['4-5'] += 1;
    else if (n <= 10) buckets['6-10'] += 1;
    else buckets['11+'] += 1;
  }
  return buckets;
}

async function main() {
  const rows = await load(JSONL);
  const g = new NationalGraph();
  for (const r of rows) {
    g.ingest({
      sourceDataset: r.sourceDataset,
      sourceRecordId: r.sourceRecordId,
      entityKind: r.entityKind,
      jurisdiction: r.jurisdiction,
      regulator: r.regulator,
      licenseNumber: r.licenseNumber,
      licenseClass: r.licenseClass,
      licenseTypes: r.licenseTypes,
      loas: r.loas,
      npn: r.npn,
      legalName: r.legalName,
      phone: r.phone,
      email: r.email,
      physicalAddress: r.physicalAddress,
    });
  }

  const bySource: Record<string, Raw[]> = {};
  for (const r of rows) {
    (bySource[r.sourceDataset] ??= []).push(r);
  }

  const sourceInventory: Record<string, unknown> = {};
  for (const [src, list] of Object.entries(bySource)) {
    const kinds: Record<string, number> = {};
    let npnFilled = 0;
    let valid = 0;
    let invalid = 0;
    const validSet = new Set<string>();
    const classCount: Record<string, number> = {};
    for (const r of list) {
      kinds[r.entityKind] = (kinds[r.entityKind] || 0) + 1;
      const raw = (r.npn || '').trim();
      if (raw) {
        npnFilled += 1;
        const n = normalizeNpn(raw);
        if (n) {
          valid += 1;
          validSet.add(n);
        } else invalid += 1;
      }
      const ns = resolveLicenseNamespace({
        licenseClass: r.licenseClass,
        licenseTypes: r.licenseTypes,
        linesOfAuthority: r.loas?.map((l) => l.officialText),
        licenseNumber: r.licenseNumber,
      });
      const cls = `${ns} | ${r.licenseClass || '(none)'}`.slice(0, 120);
      classCount[cls] = (classCount[cls] || 0) + 1;
    }
    sourceInventory[src] = {
      rows: list.length,
      kinds,
      npnFilled,
      npnMissing: list.length - npnFilled,
      validNpn: valid,
      invalidNpn: invalid,
      distinctValidNpn: validSet.size,
      topClasses: Object.entries(classCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 25),
    };
  }

  const npnRows = rows.map((r) => ({
    source: r.jurisdiction,
    jurisdiction: r.jurisdiction,
    entityKind: r.entityKind,
    licenseNumber: String(r.licenseNumber || ''),
    npn: r.npn ?? null,
    legalName: r.legalName,
  }));
  const census = computeNpnCensus(
    npnRows,
    (a, b) => compareLegalNames(a, b) === 'conflict'
  );

  const npnTo = new Map<string, Raw[]>();
  for (const r of rows) {
    const n = normalizeNpn(r.npn);
    if (!n) continue;
    const list = npnTo.get(n) ?? [];
    list.push(r);
    npnTo.set(n, list);
  }

  const agencyNpnCounts: number[] = [];
  const personNpnCounts: number[] = [];
  let sameNpnIncompat = 0;
  let sameNpnDiffKind = 0;
  const incompatSamples: unknown[] = [];
  const kindConflictSamples: unknown[] = [];
  const manyCredSamples: unknown[] = [];
  const emailToNpn = new Map<string, Set<string>>();
  const phoneToNpn = new Map<string, Set<string>>();
  const nameToNpn = new Map<string, Set<string>>();

  for (const [npn, list] of npnTo) {
    const agencies = list.filter((r) => r.entityKind === 'agency');
    const persons = list.filter((r) => r.entityKind === 'person');
    if (agencies.length) agencyNpnCounts.push(agencies.length);
    if (persons.length) personNpnCounts.push(persons.length);
    if (agencies.length && persons.length) {
      sameNpnDiffKind += 1;
      if (kindConflictSamples.length < 8) {
        kindConflictSamples.push({
          npn,
          names: list.map((r) => ({ kind: r.entityKind, name: r.legalName, st: r.jurisdiction })),
        });
      }
    }
    const names = agencies.map((r) => r.legalName);
    let incompat = false;
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        if (compareLegalNames(names[i], names[j]) === 'conflict') incompat = true;
      }
    }
    if (incompat) {
      sameNpnIncompat += 1;
      if (incompatSamples.length < 12) {
        incompatSamples.push({
          npn,
          names: [...new Set(agencies.map((r) => `${r.jurisdiction}:${r.legalName}`))],
        });
      }
    }
    if (list.length >= 6 && manyCredSamples.length < 8) {
      manyCredSamples.push({
        npn,
        n: list.length,
        states: [...new Set(list.map((r) => r.jurisdiction))],
        names: [...new Set(list.map((r) => r.legalName))].slice(0, 6),
      });
    }
  }

  for (const r of rows) {
    const n = normalizeNpn(r.npn);
    if (!n) continue;
    const em = (r.email || '').trim().toLowerCase();
    if (em) {
      const s = emailToNpn.get(em) ?? new Set();
      s.add(n);
      emailToNpn.set(em, s);
    }
    const ph = (r.phone || '').replace(/\D/g, '').slice(-10);
    if (ph.length === 10) {
      const s = phoneToNpn.get(ph) ?? new Set();
      s.add(n);
      phoneToNpn.set(ph, s);
    }
    const nn = r.legalName.trim().toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
    if (nn) {
      const s = nameToNpn.get(nn) ?? new Set();
      s.add(n);
      nameToNpn.set(nn, s);
    }
  }

  const sameEmailDiffNpn = [...emailToNpn.values()].filter((s) => s.size > 1).length;
  const samePhoneDiffNpn = [...phoneToNpn.values()].filter((s) => s.size > 1).length;
  const sameNameDiffNpn = [...nameToNpn.values()].filter((s) => s.size > 1).length;

  const licenseToNpn = new Map<string, Set<string>>();
  for (const r of rows) {
    const n = normalizeNpn(r.npn);
    if (!n) continue;
    const k = `${r.jurisdiction}|${r.entityKind}|${String(r.licenseNumber || '').toUpperCase()}`;
    const s = licenseToNpn.get(k) ?? new Set();
    s.add(n);
    licenseToNpn.set(k, s);
  }
  const sameLicenseDiffNpn = [...licenseToNpn.values()].filter((s) => s.size > 1).length;

  const fl = rows.filter((r) => r.jurisdiction === 'FL' && r.entityKind === 'agency');
  const flNpn = fl.map((r) => normalizeNpn(r.npn)).filter((x): x is string => Boolean(x));
  const flSet = new Set(flNpn);
  const otherSets: Record<string, Set<string>> = {};
  for (const st of ['TX', 'OH', 'VT', 'NV', 'MS']) {
    otherSets[st] = new Set(
      rows
        .filter((r) => r.jurisdiction === st)
        .map((r) => normalizeNpn(r.npn))
        .filter((x): x is string => Boolean(x))
    );
  }
  const flNpnCount = new Map<string, number>();
  for (const n of flNpn) flNpnCount.set(n, (flNpnCount.get(n) || 0) + 1);
  const flMultiN = [...flNpnCount.values()].filter((c) => c > 1).length;

  const stats = g.stats();
  const confirmedEntities = g.entities.filter((e) => e.identityConfidence === 'CONFIRMED');
  const confirmedCreds = g.credentials.filter((c) => c.attributionConfidence === 'CONFIRMED');
  const ratio =
    confirmedEntities.length > 0
      ? Number((confirmedCreds.length / confirmedEntities.length).toFixed(4))
      : null;

  const out = {
    extracted: rows.length,
    sourceInventory,
    npnDistribution: {
      overall: dist([...npnTo.values()].map((l) => l.length)),
      agency: dist(agencyNpnCounts),
      person: dist(personNpnCounts),
    },
    crossState: census.crossState,
    graphSimulation: {
      ...stats,
      confirmedEntities: confirmedEntities.length,
      confirmedCredentials: confirmedCreds.length,
      credentialRowsPerConfirmedEntity: ratio,
      highConfidence: 0,
      highConfidenceNote: 'HIGH_CONFIDENCE is unused; CONFIRMED joins only.',
    },
    collisions: {
      sameNpnIncompatibleNames: sameNpnIncompat,
      sameNpnDifferentKind: sameNpnDiffKind,
      sameLicenseDifferentNpn: sameLicenseDiffNpn,
      sameNormalizedNameDifferentNpn: sameNameDiffNpn,
      sameEmailDifferentNpn: sameEmailDiffNpn,
      samePhoneDifferentNpn: samePhoneDiffNpn,
      incompatSamples,
      kindConflictSamples,
      manyCredSamples,
    },
    florida: {
      businessRows: fl.length,
      validNpnRows: flNpn.length,
      distinctBusinessNpn: flSet.size,
      npnsWithMultipleFlCredentials: flMultiN,
      alsoTx: [...flSet].filter((n) => otherSets.TX.has(n)).length,
      alsoOh: [...flSet].filter((n) => otherSets.OH.has(n)).length,
      alsoVt: [...flSet].filter((n) => otherSets.VT.has(n)).length,
      alsoNv: [...flSet].filter((n) => otherSets.NV.has(n)).length,
      alsoMs: [...flSet].filter((n) => otherSets.MS.has(n)).length,
      crossStateNameCompatibility: (() => {
        const nameByStateNpn = new Map<string, string>();
        for (const r of rows) {
          const n = normalizeNpn(r.npn);
          if (!n) continue;
          const k = `${r.jurisdiction}|${n}`;
          if (!nameByStateNpn.has(k)) nameByStateNpn.set(k, r.legalName);
        }
        return Object.fromEntries(
          ['TX', 'OH', 'VT'].map((st) => {
            const overlap = [...flSet].filter((n) => otherSets[st]!.has(n));
            let exact = 0;
            let compatible = 0;
            let conflict = 0;
            let insufficient = 0;
            for (const n of overlap) {
              const flName = nameByStateNpn.get(`FL|${n}`);
              const otherName = nameByStateNpn.get(`${st}|${n}`);
              const cmp = compareLegalNames(flName, otherName);
              if (cmp === 'match') exact += 1;
              else if (cmp === 'compatible') compatible += 1;
              else if (cmp === 'conflict') conflict += 1;
              else insufficient += 1;
            }
            return [st, { overlap: overlap.length, exact, compatible, conflict, insufficient }];
          })
        );
      })(),
    },
  };

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
