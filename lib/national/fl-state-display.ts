/**
 * FL-INS-007 display model. Pure. Safe for tests and the /florida page.
 * Counts come from insurance-fl-state-intel-v1 — never JSX literals.
 */
import {
  APPOINTER_SAFE_COPY,
  CANONICAL_SNAPSHOT_FINGERPRINT,
  CHOICES_PROFILE_COPY,
  CITIZENS_LABEL,
  CITIZENS_MODULE_STATE,
  CMS_SAFE_COPY,
  displayModelContainsRankAsPif,
  FL_STATE_INTEL_VERSION,
  formatCount,
  formatUsd,
  NFIP_SAFE_COPY,
  NAMESPACE_LABEL,
  REGULATORY_SECTION_HEADING,
  residentialPifTotal,
} from '@/lib/national/fl-state-intel';

export type FlHeadlineCard = {
  id: string;
  value: string;
  label: string;
  grain: string;
};

export type FlBarRow = {
  key: string;
  label: string;
  value: number;
  display: string;
};

export type FloridaStateView = {
  version: string;
  generatedAt: string;
  asOf: string;
  fingerprint: string;
  title: string;
  cards: FlHeadlineCard[];
  agency: {
    rows: string;
    distinct: string;
    unknownStatus: string;
    withAppointment: string;
    withoutAppointment: string;
    namespaces: FlBarRow[];
    classes: FlBarRow[];
  };
  person: {
    rows: string;
    distinct: string;
    classCount: string;
    appointedTo: string;
    distinctAppointed: string;
    classes: FlBarRow[];
  };
  appointment: {
    observations: string;
    agencies: string;
    appointers: string;
    current: string;
    historical: string;
    personAppointedTo: string;
    distinctPersons: string;
    dfsAppointers: string;
    resolvesTo: string;
    coincidences: string;
    limitation: string;
    statusBars: FlBarRow[];
  };
  oir: {
    legalInsurers: string;
    active: string;
    withNaic: string;
    withoutNaic: string;
    matchRows: string;
    distinctNaic: string;
    safeCodes: string;
    coverageBars: FlBarRow[];
  };
  mir: {
    insurers: string;
    observations: string;
    period: string;
    asOf: string;
    pifPersonal: string;
    pifCommercial: string;
    pifTotal: string;
    pifTotalNumeric: number;
    unusedRankField: number;
    premiumTotal: string;
    premiumPersonal: string;
    premiumCommercial: string;
    exposure: string;
    pifBars: FlBarRow[];
    premiumBars: FlBarRow[];
  };
  surplus: {
    eligible: string;
    attached: string;
    unresolved: string;
    bars: FlBarRow[];
  };
  cms: {
    national: string;
    attached: string;
    unattached: string;
    conflict: string;
    publicAgencyReady: string;
  };
  citizens: {
    label: string;
    state: string;
    renderedCount: null;
  };
  choices: { copy: string };
  irfs: { from: string; cap: string };
  nfip: { cards: string; attaches: string; copy: string };
  regulatory: {
    heading: string;
    stored: string;
    family: string;
    attached: string;
    marketConduct: string;
    financialExam: string;
    orders: string;
  };
  clocks: Array<{ id: string; label: string; value: string }>;
  readiness: {
    credential: number;
    appointment: number;
    cms: number;
    market: number;
    surplus: number;
    regulatory: number;
    nfip: number;
  };
};

type AnyRec = Record<string, unknown>;

function asRec(v: unknown): AnyRec {
  return v && typeof v === 'object' ? (v as AnyRec) : {};
}

function num(v: unknown): number {
  return Number(v || 0);
}

function barsFromRecord(rec: AnyRec, labels?: Record<string, string>): FlBarRow[] {
  return Object.entries(rec)
    .map(([key, value]) => ({
      key,
      label: labels?.[key] || key,
      value: num(value),
      display: formatCount(num(value)),
    }))
    .sort((a, b) => b.value - a.value);
}

export function buildFloridaStateView(snapshot: unknown, readiness: unknown): FloridaStateView {
  const snap = asRec(snapshot);
  if (snap.version !== FL_STATE_INTEL_VERSION) {
    throw new Error(`Unexpected Florida snapshot version: ${String(snap.version)}`);
  }
  const agency = asRec(snap.agencyMetrics);
  const person = asRec(snap.personMetrics);
  const apt = asRec(snap.appointmentMetrics);
  const legal = asRec(snap.legalInsurerMetrics);
  const mir = asRec(snap.marketMetrics);
  const surplus = asRec(snap.surplusLinesMetrics);
  const cms = asRec(snap.cmsMetrics);
  const clocks = asRec(snap.sourceClocks);
  const nfip = asRec(snap.nfip);
  const irfs = asRec(snap.irfs);
  const reg = asRec(snap.regulatoryMetrics);
  const ready = asRec(readiness);

  const pifPersonal = num(mir.pif_personal_residential);
  const pifCommercial = num(mir.pif_commercial_residential);
  const pifTotal = residentialPifTotal(pifPersonal, pifCommercial);
  const unusedRank = num(mir.pif_stored_total_metric_unused);
  if (displayModelContainsRankAsPif(pifTotal, unusedRank)) {
    throw new Error('MIR rank field collapsed into PIF total');
  }
  if (pifTotal !== num(mir.pif_total)) {
    throw new Error('Snapshot PIF total does not equal personal + commercial');
  }

  const ns = asRec(agency.namespace);
  const classes = asRec(agency.license_class);
  const personClasses = asRec(person.license_class_top);
  const aptStatus = asRec(apt.status);

  return {
    version: String(snap.version),
    generatedAt: String(snap.generatedAt),
    asOf: String(snap.asOf),
    fingerprint: CANONICAL_SNAPSHOT_FINGERPRINT,
    title: 'Florida Insurance Research, Licensing & Market Data',
    cards: [
      {
        id: 'agencies',
        value: formatCount(agency.distinct_agencies_with_fl_credential),
        label: 'Florida-credentialed agencies',
        grain: `${formatCount(agency.distinct_agencies_with_fl_credential)} distinct agencies with at least one Florida credential record.`,
      },
      {
        id: 'persons',
        value: formatCount(person.distinct_persons_with_fl_producer_or_other_credential),
        label: 'Florida-credentialed individuals',
        grain: `${formatCount(person.distinct_persons_with_fl_producer_or_other_credential)} distinct persons with at least one Florida credential record. This is a credential universe, not a public people directory.`,
      },
      {
        id: 'oir-active',
        value: formatCount(legal.oir_active_companies),
        label: 'OIR active companies',
        grain: `${formatCount(legal.oir_active_companies)} companies in the Florida OIR Active Company Search extract. This is the OIR company grain, not a count of “Florida insurers.”`,
      },
      {
        id: 'oir-naic',
        value: formatCount(legal.oir_with_naic),
        label: 'OIR companies with NAIC',
        grain: `${formatCount(legal.oir_with_naic)} OIR active-company records that include a NAIC company code. Do not add this to legal-insurer or MIR counts.`,
      },
      {
        id: 'mir',
        value: formatCount(mir.insurers_attached),
        label: 'June 2026 MIR reporting insurers',
        grain: `${formatCount(mir.insurers_attached)} NAIC insurers represented in the June 2026 OIR residential market extract. Trade-secret companies are omitted.`,
      },
      {
        id: 'surplus',
        value: formatCount(surplus.eligible_observations),
        label: 'Florida surplus-lines eligibility observations',
        grain: `${formatCount(surplus.eligible_observations)} surplus-lines eligibility observations. Eligibility is not admitted status.`,
      },
    ],
    agency: {
      rows: formatCount(agency.fl_credential_rows),
      distinct: formatCount(agency.distinct_agencies_with_fl_credential),
      unknownStatus: formatCount(agency.unknown_status_not_inferred_inactive),
      withAppointment: formatCount(agency.with_ge1_fl_appointed_by),
      withoutAppointment: formatCount(agency.fl_credentialed_without_appointment),
      namespaces: barsFromRecord(ns, NAMESPACE_LABEL),
      classes: barsFromRecord(classes).slice(0, 12),
    },
    person: {
      rows: formatCount(person.fl_credential_rows),
      distinct: formatCount(person.distinct_persons_with_fl_producer_or_other_credential),
      classCount: formatCount(person.license_class_distinct),
      appointedTo: formatCount(person.fl_person_appointments_APPOINTED_TO),
      distinctAppointed: formatCount(person.distinct_persons_with_fl_appointment),
      classes: barsFromRecord(personClasses).slice(0, 12),
    },
    appointment: {
      observations: formatCount(apt.florida_appointed_by),
      agencies: formatCount(apt.distinct_agencies),
      appointers: formatCount(apt.distinct_appointers),
      current: formatCount(num(aptStatus.CURRENT)),
      historical: formatCount(num(aptStatus.HISTORICAL)),
      personAppointedTo: formatCount(apt.person_APPOINTED_TO),
      distinctPersons: formatCount(person.distinct_persons_with_fl_appointment),
      dfsAppointers: formatCount(apt.fl_dfs_appointers),
      resolvesTo: formatCount(apt.FL_APPOINTER_RESOLVES_TO),
      coincidences: formatCount(apt.digit_coincidences_review_required),
      limitation: APPOINTER_SAFE_COPY,
      statusBars: barsFromRecord(aptStatus),
    },
    oir: {
      legalInsurers: formatCount(legal.national_legal_insurers),
      active: formatCount(legal.oir_active_companies),
      withNaic: formatCount(legal.oir_with_naic),
      withoutNaic: formatCount(legal.oir_without_naic),
      matchRows: formatCount(legal.exact_national_oir_match_rows),
      distinctNaic: formatCount(legal.exact_national_oir_distinct_naic),
      safeCodes: formatCount(legal.safe_fl_oir_company_code),
      coverageBars: [
        {
          key: 'with',
          label: 'OIR records with NAIC',
          value: num(legal.oir_with_naic),
          display: formatCount(legal.oir_with_naic),
        },
        {
          key: 'without',
          label: 'OIR records without NAIC',
          value: num(legal.oir_without_naic),
          display: formatCount(legal.oir_without_naic),
        },
      ],
    },
    mir: {
      insurers: formatCount(mir.insurers_attached),
      observations: formatCount(mir.observations),
      period: `${String(mir.period_start)} through ${String(mir.period_end)}`,
      asOf: String(mir.as_of),
      pifPersonal: formatCount(pifPersonal),
      pifCommercial: formatCount(pifCommercial),
      pifTotal: formatCount(pifTotal),
      pifTotalNumeric: pifTotal,
      unusedRankField: unusedRank,
      premiumTotal: formatUsd(num(mir.written_premium_total)),
      premiumPersonal: formatUsd(num(mir.written_premium_personal_residential)),
      premiumCommercial: formatUsd(num(mir.written_premium_commercial_residential)),
      exposure: formatUsd(num(mir.exposure_total)),
      pifBars: [
        {
          key: 'personal',
          label: 'Personal residential PIF',
          value: pifPersonal,
          display: formatCount(pifPersonal),
        },
        {
          key: 'commercial',
          label: 'Commercial residential PIF',
          value: pifCommercial,
          display: formatCount(pifCommercial),
        },
      ],
      premiumBars: [
        {
          key: 'personal',
          label: 'Personal residential written premium',
          value: num(mir.written_premium_personal_residential),
          display: formatUsd(num(mir.written_premium_personal_residential)),
        },
        {
          key: 'commercial',
          label: 'Commercial residential written premium',
          value: num(mir.written_premium_commercial_residential),
          display: formatUsd(num(mir.written_premium_commercial_residential)),
        },
      ],
    },
    surplus: {
      eligible: formatCount(surplus.eligible_observations),
      attached: formatCount(surplus.exact_naic_attached),
      unresolved: formatCount(surplus.unresolved),
      bars: [
        {
          key: 'attached',
          label: 'Exact NAIC attached',
          value: num(surplus.exact_naic_attached),
          display: formatCount(surplus.exact_naic_attached),
        },
        {
          key: 'unresolved',
          label: 'Unresolved (no exact NAIC)',
          value: num(surplus.unresolved),
          display: formatCount(surplus.unresolved),
        },
      ],
    },
    cms: {
      national: formatCount(cms.national_observations),
      attached: formatCount(cms.attached),
      unattached: formatCount(cms.unattached),
      conflict: formatCount(cms.kind_conflict),
      publicAgencyReady: formatCount(cms.public_bridged_agencies_with_cms),
    },
    citizens: {
      label: CITIZENS_LABEL,
      state: CITIZENS_MODULE_STATE,
      renderedCount: null,
    },
    choices: { copy: CHOICES_PROFILE_COPY },
    irfs: {
      from: String(irfs.from),
      cap: formatCount(irfs.cap),
    },
    nfip: {
      cards: formatCount(nfip.registry_cards),
      attaches: formatCount(nfip.exact_npn_attaches),
      copy: NFIP_SAFE_COPY,
    },
    regulatory: {
      heading: REGULATORY_SECTION_HEADING,
      stored: formatCount(reg.stored_florida_rows),
      family: String(reg.family),
      attached: formatCount(reg.attached),
      marketConduct: formatCount(reg.catalog_market_conduct_unattached),
      financialExam: formatCount(reg.catalog_financial_exam_unattached),
      orders: formatCount(reg.catalog_orders_unattached),
    },
    clocks: [
      {
        id: 'oir',
        label: 'OIR Active Company Search',
        value: `${String(clocks.oir_active_company_search).slice(0, 10)} source capture`,
      },
      {
        id: 'mir',
        label: 'MIR residential extract',
        value: 'June 2026 / as-of 2026-06-30',
      },
      {
        id: 'dfs-apt',
        label: 'DFS appointments',
        value: 'Source-specific current extracts (agency appointed_by; person APPOINTED_TO locked INS-NAT-013 census)',
      },
      {
        id: 'dfs-cred',
        label: 'DFS credentials',
        value: 'Source clock unavailable in stored observations (source_observed_at absent)',
      },
      {
        id: 'fslso',
        label: 'FSLSO eligibility',
        value: String(clocks.fslso_eligibility),
      },
      {
        id: 'receiver',
        label: 'DFS receiver list',
        value: '2026-08-28',
      },
      {
        id: 'choices',
        label: 'CHOICES',
        value: 'Interactive / current official tool; no bulk as-of',
      },
      {
        id: 'irfs',
        label: 'IRFS',
        value: 'Search range 2001-01-05–present; about 2,500 results per search',
      },
      {
        id: 'citizens',
        label: 'Citizens',
        value: 'Current official dated PIF unavailable',
      },
      {
        id: 'nfip',
        label: 'NFIP',
        value: 'Live registry listing; NPN absent',
      },
    ],
    readiness: {
      credential: num(ready.READY_FOR_FL_CREDENTIAL_MODULE),
      appointment: num(ready.READY_FOR_FL_APPOINTMENT_MODULE),
      cms: num(ready.READY_FOR_CMS_MODULE),
      market: num(ready.READY_FOR_FL_MARKET_MODULE),
      surplus: num(ready.READY_FOR_SURPLUS_MODULE),
      regulatory: num(ready.READY_FOR_FL_REGULATORY_MODULE),
      nfip: num(ready.NFIP_deterministic),
    },
  };
}

export { CMS_SAFE_COPY };
