/**
 * INS-NAT-003 classification dry-run. No DB writes, no graph backfill.
 *   npx tsx scripts/national/classify-dry-run.ts
 */
import { createReadStream, writeFileSync, existsSync, readFileSync } from 'fs';
import { createHash } from 'crypto';
import { createInterface } from 'readline';
import { classifyAndRollup, researchDenominators } from '../../lib/national/classification';
import { floridaRepeatedNpnMetrics } from '../../lib/national/metrics';
import { normalizeNpn } from '../../lib/national/npn';
import { compareLegalNames } from '../../lib/national/names';
import type { ClassificationInput } from '../../lib/national/classification';
import {
  CLASSIFICATION_REGISTRY_VERSION,
  SOURCE_OFFICIAL_SUPPORT,
} from '../../lib/national/classification';

const JSONL =
  process.env.INS_NAT_003_JSONL ||
  process.env.INS_NAT_004_JSONL ||
  'C:/Users/Michael.Savitsky/agent-tools/ins-nat-004-staging.jsonl';

const OHIO_CLASSES =
  process.env.INS_NAT_005_ODI_CLASSES ||
  'C:/Users/Michael.Savitsky/agent-tools/odi-mailing-npn-classes.json';

const OUT =
  process.env.INS_NAT_005_OUT ||
  process.env.INS_NAT_003_OUT ||
  'C:/Users/Michael.Savitsky/agent-tools/ins-nat-005-dry-run.json';

type Raw = ClassificationInput & {
  sourceTable?: string;
  regulator?: string;
  legalName?: string | null;
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

function top(counter: Map<string, number>, n = 15) {
  return [...counter.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

async function main() {
  const rows = await load(JSONL);
  let ohioOverlay = 0;
  let ohioMap: Record<string, { classes?: string[] }> = {};
  if (existsSync(OHIO_CLASSES)) {
    ohioMap = JSON.parse(readFileSync(OHIO_CLASSES, 'utf8')) as Record<
      string,
      { classes?: string[] }
    >;
  }
  const inputs: ClassificationInput[] = rows.map((r) => {
    let licenseClass = r.licenseClass ?? null;
    let licenseTypes = r.licenseTypes ?? [];
    if (r.sourceDataset === 'ohio_odi') {
      const npn = String(r.npn || r.licenseNumber || '').trim();
      const hit = ohioMap[npn];
      if (hit?.classes?.length) {
        licenseTypes = hit.classes;
        licenseClass = hit.classes[0] ?? null;
        ohioOverlay += 1;
      }
    }
    return {
      sourceDataset: r.sourceDataset,
      sourceRecordId: r.sourceRecordId,
      jurisdiction: r.jurisdiction,
      entityKind: r.entityKind,
      licenseNumber: r.licenseNumber,
      legalName: r.legalName,
      npn: r.npn,
      licenseClass,
      licenseTypes,
      loas: r.loas,
      regulatoryStatus: r.regulatoryStatus ?? null,
      published: false,
    };
  });

  const nameConflictNpns = new Set<string>();
  const npnNames = new Map<string, string[]>();
  for (const r of inputs) {
    const npn = normalizeNpn(r.npn);
    if (!npn) continue;
    const list = npnNames.get(npn) ?? [];
    list.push(String(r.legalName || ''));
    npnNames.set(npn, list);
  }
  for (const [npn, names] of npnNames) {
    const unique = Array.from(new Set(names));
    if (unique.length < 2) continue;
    let conflict = false;
    for (let i = 0; i < unique.length && !conflict; i++) {
      for (let j = i + 1; j < unique.length; j++) {
        if (compareLegalNames(unique[i]!, unique[j]!) === 'conflict') {
          conflict = true;
          break;
        }
      }
    }
    if (conflict) nameConflictNpns.add(npn);
  }

  const { credentials, entities } = classifyAndRollup(inputs, (key) => {
    if (key.startsWith('npn:')) {
      const npn = key.split(':')[2] || '';
      if (nameConflictNpns.has(npn)) return 'REVIEW_REQUIRED';
      return 'CONFIRMED';
    }
    return 'HIGH_CONFIDENCE';
  });

  const national = researchDenominators(credentials, entities);

  const bySource: Record<string, unknown> = {};
  const sources = Array.from(new Set(inputs.map((r) => r.sourceDataset)));
  const npnStates = new Map<string, Set<string>>();
  for (const c of credentials) {
    if (!c.npn) continue;
    const set = npnStates.get(c.npn) ?? new Set();
    set.add(c.jurisdiction);
    npnStates.set(c.npn, set);
  }
  for (const src of sources) {
    const srcInputs = inputs.filter((r) => r.sourceDataset === src);
    const rolled = classifyAndRollup(srcInputs, (key) => {
      if (key.startsWith('npn:')) {
        const npn = key.split(':')[2] || '';
        if (nameConflictNpns.has(npn)) return 'REVIEW_REQUIRED';
        return 'CONFIRMED';
      }
      return 'HIGH_CONFIDENCE';
    });
    const creds = rolled.credentials;
    const ents = rolled.entities;
    const classCounts = new Map<string, number>();
    for (const c of creds) {
      const k = `${c.primaryProductClass} | ${c.rawTypesPreserved[0] || '(empty)'}`;
      classCounts.set(k, (classCounts.get(k) ?? 0) + 1);
    }
    const coreNpns = ents.filter((e) => e.coreAgencyEligible && e.npn).map((e) => e.npn!);
    const shared = { TX: 0, OH: 0, VT: 0, NV: 0, MS: 0, any: 0 };
    for (const npn of coreNpns) {
      const states = npnStates.get(npn);
      if (!states || states.size < 2) continue;
      shared.any += 1;
      if (states.has('TX')) shared.TX += 1;
      if (states.has('OH')) shared.OH += 1;
      if (states.has('VT')) shared.VT += 1;
      if (states.has('NV')) shared.NV += 1;
      if (states.has('MS')) shared.MS += 1;
    }
    bySource[src] = {
      records: creds.length,
      credentials: creds.length,
      validNpnRows: creds.filter((c) => Boolean(c.npn)).length,
      distinctNpnIdentities: new Set(creds.map((c) => c.npn).filter(Boolean)).size,
      provisionalRows: creds.filter((c) => !c.npn).length,
      coreEligibleCredentials: creds.filter((c) => c.coreAgencyEligible).length,
      specialtyCredentials: creds.filter((c) => c.primaryProductClass === 'specialty_insurance').length,
      ancillaryCredentials: creds.filter((c) => c.primaryProductClass === 'ancillary_distribution').length,
      claimsCredentials: creds.filter((c) => c.primaryProductClass === 'claims_service').length,
      warrantyCredentials: creds.filter((c) => c.primaryProductClass === 'warranty_service').length,
      titleCredentials: creds.filter((c) => c.primaryProductClass === 'title').length,
      bailCredentials: creds.filter((c) => c.primaryProductClass === 'bail').length,
      unknownCredentials: creds.filter((c) => c.classificationUnknown).length,
      identities: ents.length,
      confirmedIdentities: ents.filter((e) => e.identityKind === 'npn').length,
      provisionalIdentities: ents.filter((e) => e.identityKind === 'provisional').length,
      reviewRequiredIdentities: ents.filter((e) => e.identityConfidence === 'REVIEW_REQUIRED').length,
      coreAgencies: ents.filter((e) => e.coreAgencyEligible).length,
      currentCoreAgencies: null,
      currentCoreNote:
        'Regulator status was not in the INS-NAT-004 extract. Florida rows come from a valid-licenses file so they are current-at-observation, but this dry-run does not claim a national current count.',
      specialtyEntities: ents.filter((e) => e.primaryProductClass === 'specialty_insurance' && !e.coreAgencyEligible)
        .length,
      ancillaryEntities: ents.filter((e) => e.primaryProductClass === 'ancillary_distribution' && !e.coreAgencyEligible)
        .length,
      claimsEntities: ents.filter((e) => e.primaryProductClass === 'claims_service' && !e.coreAgencyEligible).length,
      warrantyEntities: ents.filter((e) => e.primaryProductClass === 'warranty_service' && !e.coreAgencyEligible)
        .length,
      titleEntities: ents.filter((e) => e.primaryProductClass === 'title' && !e.coreAgencyEligible).length,
      bailEntities: ents.filter((e) => e.primaryProductClass === 'bail' && !e.coreAgencyEligible).length,
      tpaEntities: ents.filter((e) => e.primaryProductClass === 'tpa' && !e.coreAgencyEligible).length,
      unknownEntities: ents.filter((e) => e.classificationUnknown).length,
      multiCredentialCore: ents.filter((e) => e.coreAgencyEligible && e.credentialCount >= 2).length,
      multiStateCoreShared: shared,
      topClasses: top(classCounts, 20),
      floridaRepeated:
        src === 'florida_dfs'
          ? floridaRepeatedNpnMetrics(creds.map((c) => ({ jurisdiction: 'FL', npn: c.npn })))
          : null,
    };
  }

  const location = entities
    .filter((e) => e.identityKind === 'npn' && e.credentialCount >= 11)
    .sort((a, b) => b.credentialCount - a.credentialCount);

  const att = location.filter((e) => /at&?t|cingular|new cingular/i.test(e.legalName));
  const tmobile = location.filter((e) => /t-?mobile/i.test(e.legalName));

  const mixed = entities.filter((e) => e.mixedCredential);
  const mixedCore = mixed.filter((e) => e.coreAgencyEligible);

  const proposed = entities.filter((e) => {
    if (e.identityKind !== 'npn') return false;
    if (e.identityConfidence === 'REVIEW_REQUIRED') return false;
    if (!e.coreAgencyEligible) return false;
    if (e.classificationUnknown) return false;
    if (!e.npn) return false;
    return true;
  });

  const proposedCreds = credentials.filter((c) => {
    if (!c.npn) return false;
    return proposed.some((e) => e.npn === c.npn && e.entityKind === c.entityKind);
  });

  const proposedNpns = proposed.map((e) => e.npn!).sort();
  const fingerprint = createHash('sha256').update(proposedNpns.join('\n')).digest('hex');

  const excluded = {
    provisional: entities.filter((e) => e.identityKind === 'provisional').length,
    reviewRequired: entities.filter((e) => e.identityConfidence === 'REVIEW_REQUIRED').length,
    classificationUnknown: entities.filter((e) => e.classificationUnknown).length,
    nonCoreConfirmed: entities.filter(
      (e) => e.identityKind === 'npn' && !e.coreAgencyEligible && !e.classificationUnknown
    ).length,
  };

  const report = {
    registryVersion: CLASSIFICATION_REGISTRY_VERSION,
    extractedRows: rows.length,
    officialSupport: SOURCE_OFFICIAL_SUPPORT,
    national,
    bySource,
    locationNetworks: {
      npnsWith11PlusCredentials: location.length,
      attLike: att.slice(0, 8).map((e) => ({
        npn: e.npn,
        name: e.legalName,
        credentials: e.credentialCount,
        primary: e.primaryProductClass,
        core: e.coreAgencyEligible,
        states: e.jurisdictions,
      })),
      tmobileLike: tmobile.slice(0, 8).map((e) => ({
        npn: e.npn,
        name: e.legalName,
        credentials: e.credentialCount,
        primary: e.primaryProductClass,
        core: e.coreAgencyEligible,
        states: e.jurisdictions,
      })),
      top20: location.slice(0, 20).map((e) => ({
        npn: e.npn,
        name: e.legalName,
        credentials: e.credentialCount,
        primary: e.primaryProductClass,
        core: e.coreAgencyEligible,
        states: e.jurisdictions,
        mixed: e.mixedCredential,
      })),
    },
    mixedCredential: {
      entities: mixed.length,
      coreWithSpecialty: mixedCore.length,
      samples: mixedCore.slice(0, 12).map((e) => ({
        npn: e.npn,
        name: e.legalName,
        classes: e.productClasses,
        credentials: e.credentialCount,
        states: e.jurisdictions,
      })),
    },
    proposedConfirmedCoreBackfill: {
      executed: false,
      eligibility:
        'Confirmed NPN + agency kind + at least one CONFIRMED/HIGH core-agency credential + identity not REVIEW_REQUIRED + not classification-unknown. Provisional NV/MS excluded. Ohio-only unknown excluded. Mixed core+specialty included once.',
      sourceRecordsInScope: proposedCreds.length,
      expectedEntities: proposed.length,
      expectedCredentials: proposedCreds.length,
      multiStateEntities: proposed.filter((e) => e.jurisdictions.length >= 2).length,
      provisionalExcluded: excluded.provisional,
      reviewRequiredExcluded: excluded.reviewRequired,
      classificationUnknownExcluded: excluded.classificationUnknown,
      nonCoreConfirmedIdentitiesLeftOut: excluded.nonCoreConfirmed,
      fingerprintSha256OfSortedNpns: fingerprint,
    },
  };

  writeFileSync(OUT, JSON.stringify(report, null, 2), 'utf8');
  console.log(
    JSON.stringify(
      {
        wrote: OUT,
        registryVersion: CLASSIFICATION_REGISTRY_VERSION,
        extractedRows: rows.length,
        national,
        florida: bySource.florida_dfs,
        texas: bySource.texas_tdi,
        ohio: bySource.ohio_odi,
        nevada: bySource.nevada_doi,
        vermont: bySource.vermont_dfr,
        mississippi: bySource.mississippi_mid,
        locationTop5: report.locationNetworks.top20.slice(0, 5),
        attLike: report.locationNetworks.attLike,
        tmobileLike: report.locationNetworks.tmobileLike,
        mixed: report.mixedCredential,
        proposed: report.proposedConfirmedCoreBackfill,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
