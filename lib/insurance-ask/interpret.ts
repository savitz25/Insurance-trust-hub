import {
  ASK_DEFINITIONS,
  CREDENTIAL_STATES,
  type GeographyDimension,
  type InsuranceEntityClass,
  type InsuranceResearchQuery,
  type ParsedInsuranceAsk,
} from './contract';

const STATE_NAMES: Record<string, string> = {
  florida: 'FL',
  texas: 'TX',
  massachusetts: 'MA',
  ohio: 'OH',
  vermont: 'VT',
  fl: 'FL',
  tx: 'TX',
  ma: 'MA',
  oh: 'OH',
  vt: 'VT',
};

function detectStates(q: string): string[] {
  const found: string[] = [];
  const add = (code: string) => {
    if (!found.includes(code)) found.push(code);
  };
  for (const [name, code] of Object.entries(STATE_NAMES)) {
    if (name.length === 2) {
      if (new RegExp(`\\bin ${name}\\b`, 'i').test(q)) add(code);
    } else if (new RegExp(`\\b${name}\\b`, 'i').test(q)) add(code);
  }
  return found;
}

function detectClass(q: string): InsuranceEntityClass | undefined {
  if (/\b(legal insurers?|insurers?|carriers?|insurance compan(?:y|ies))\b/i.test(q) && !/\bagenc/i.test(q) && !/\bproducer|agent|person/i.test(q)) {
    return 'insurer';
  }
  if (/\b(producers?|individual|persons?|agents?)\b/i.test(q) && !/\bagenc/i.test(q)) return 'person';
  if (/\bagenc(y|ies)\b/i.test(q)) return 'agency';
  return undefined;
}

function detectLoas(q: string): string[] {
  const out: string[] = [];
  const add = (v: string) => {
    if (!out.includes(v)) out.push(v);
  };
  if (/\bproperty\b/i.test(q)) add('Property');
  if (/\bcasualty\b/i.test(q)) add('Casualty');
  if (/\blife\b/i.test(q) && !/\bvariable life\b/i.test(q)) add('Life');
  if (/\b(health|accident\s*(&|and)\s*health|a\s*&\s*h)\b/i.test(q)) add('Health');
  if (/\bpersonal lines\b/i.test(q)) add('Personal Lines');
  if (/\bvariable (life|annuit)/i.test(q)) add('Variable Life / Annuity');
  return out;
}

function geographyMeaning(q: string): GeographyDimension {
  if (/\bdomicil/i.test(q)) return 'regulatory_domicile';
  if (/\blocated|office|address|physical\b/i.test(q) && !/\blicensed|credentialed\b/i.test(q)) {
    return 'recorded_address_state';
  }
  return 'credential_jurisdiction';
}

function fail(reason: string, alternatives: string[]): InsuranceResearchQuery {
  return { mode: 'fail_closed', page: 1, failReason: reason, alternatives };
}

function isRanking(q: string): boolean {
  return (
    /\b(best|safest|most trustworthy|cheapest|top[- ]?rated|most trusted|recommended|trust score)\b/i.test(q) &&
    /\b(insurance|insurer|agenc|agent|producer|carrier)/i.test(q)
  );
}

function isQuote(q: string): boolean {
  return /\b(cheapest (homeowners|auto|policy)|what will .+ charge|quote|premium for me)\b/i.test(q);
}

function isAdvice(q: string): boolean {
  return /\b(how much homeowners|should i (buy|choose)|ho-3|ho-5)\b/i.test(q);
}

export type { ParsedInsuranceAsk };

export function interpretInsuranceAskQuery(raw: string, page = 1): ParsedInsuranceAsk {
  const q = raw.trim().slice(0, 400);
  const lines: ParsedInsuranceAsk['interpretation'] = [];
  const push = (label: string, value: string) => lines.push({ label, value });
  const safePage = Math.max(1, Math.min(200, page));

  if (!q) {
    return {
      raw: q,
      query: fail('Enter a research question. InsuranceTrustHub organizes regulatory records; it does not recommend insurance.', [
        'Show insurance agencies credentialed in Florida.',
        'What is an NPN?',
      ]),
      interpretation: [{ label: 'Status', value: 'No question yet' }],
    };
  }

  if (/\bhow many insurance providers\b/i.test(q)) {
    const query = fail(
      'Counts require an entity class. Agencies, individual producers, and legal insurers are not added into one “insurance providers” total.',
      [
        'How many agencies are credentialed in Florida?',
        'How many individual producers are credentialed in Florida?',
      ],
    );
    push('Mode', 'fail_closed');
    return { raw: q, query, interpretation: lines };
  }

  if (isRanking(q)) {
    const query = fail(
      'InsuranceTrustHub does not rank agencies, agents, or insurers and does not publish a TrustHub insurance score.',
      [
        'Show insurance agencies credentialed in Florida.',
        'What is the difference between an insurance agency and insurer?',
      ],
    );
    push('Mode', 'fail_closed');
    return { raw: q, query, interpretation: lines };
  }

  if (isQuote(q)) {
    const query = fail(
      'InsuranceTrustHub is not a quote engine. Regulatory credentials do not establish the premium a carrier would charge you.',
      ['Show insurance agencies credentialed in Florida.', 'Open Marketplace plan research as a federal overlay, not a DOI license.'],
    );
    push('Mode', 'fail_closed');
    return { raw: q, query, interpretation: lines };
  }

  if (isAdvice(q)) {
    const query = fail(
      'Coverage amount and form (HO-3 vs HO-5) are educational/advice questions, not entity-regulatory queries. Structured Ask does not fabricate personalized coverage advice.',
      ['What is a line of authority?', 'Show insurance agencies credentialed in Florida.'],
    );
    push('Mode', 'fail_closed');
    return { raw: q, query, interpretation: lines };
  }

  if (/\bclean record\b|\bno complaints\b/i.test(q)) {
    const query = fail(
      'Missing evidence is not a clean record. InsuranceTrustHub does not infer a complaint-free or “clean” status from absence.',
      ['Show insurance agencies credentialed in Florida.'],
    );
    push('Mode', 'fail_closed');
    return { raw: q, query, interpretation: lines };
  }

  if (/\b(unlicensed|unauthorized)\b/i.test(q) && !/\bnpn\s*#?\s*\d/i.test(q)) {
    const query = fail(
      'Missing evidence is not unlicensed and not unauthorized. Ask will not infer authorization status from absence in this extract.',
      ['Find NPN 1234567.', 'Show insurance agencies credentialed in Florida.'],
    );
    push('Mode', 'fail_closed');
    return { raw: q, query, interpretation: lines };
  }

  if (
    /\b(sell|write|appointed for) (every|all) insurers?|authorized to sell every|every insurer'?s products|all insurers'? products\b/i.test(
      q,
    )
  ) {
    const query = fail(
      'A state credential or line of authority does not establish appointment with every insurer. Ask only answers an appointment when indexed evidence names the person/agency, appointing entity, and jurisdiction.',
      ['What is an insurance appointment?', 'Show insurance agencies credentialed in Florida.'],
    );
    push('Mode', 'fail_closed');
    return { raw: q, query, interpretation: lines };
  }

  if (/\b(broward|palm beach|miami[-\s]?dade).*(appoint|authorized to write|service (area|territory))\b/i.test(q) ||
    /\bcounty appointment\b/i.test(q)) {
    const query = fail(
      'Florida county appointment records have specialized regulatory meaning and are not treated as “authorized to write insurance in this county” or as a service-territory map.',
      ['Show insurance agencies credentialed in Florida.'],
    );
    push('Mode', 'fail_closed');
    return { raw: q, query, interpretation: lines };
  }

  if (/\bserv(e|es|ing)\b|\bservice territory\b/i.test(q) && /\b(florida|texas|agency|agencies)\b/i.test(q)) {
    const query = fail(
      'Credential jurisdiction is not service territory. Ask can research agencies credentialed in a state, not “agencies that serve” a state.',
      ['Show insurance agencies credentialed in Florida.'],
    );
    push('Mode', 'fail_closed');
    return { raw: q, query, interpretation: lines };
  }

  if (/^\d{4,12}$/.test(q)) {
    const query = fail(
      'Bare digits are ambiguous (NPN, NAIC company code, license number, or other network identifiers). Use a labeled identifier such as “Find NPN 1234567.”',
      ['Find NPN 1234567.'],
    );
    push('Mode', 'fail_closed');
    push('Identifier', 'Unlabeled digits');
    return { raw: q, query, interpretation: lines };
  }

  if (/\bwhat is an? npn\b/i.test(q)) return definition(q, 'npn');
  if (
    /\bwhat is an? (insurance )?line of authority\b/i.test(q) ||
    /\bwhat does a line of authority mean\b/i.test(q)
  ) {
    return definition(q, 'loa');
  }
  if (/\bwhat is an insurance appointment\b|\bwhat does an appointment mean\b/i.test(q)) return definition(q, 'appointment');
  if (/\bwhat does (insurer )?domicile mean\b/i.test(q)) return definition(q, 'domicile');
  if (/\bwhat does marketplace registration/i.test(q) || /\bwhat is marketplace registration evidence\b/i.test(q)) {
    return definition(q, 'marketplace');
  }
  if (/\bwhat is a legal insurer\b/i.test(q)) return definition(q, 'legal_insurer');
  if (/\bdifference between an? (insurance )?agency and (an? )?(insurer|carrier)\b/i.test(q)) {
    return definition(q, 'agency_vs_insurer');
  }

  const npn = q.match(/\bnpn\s*#?\s*(\d{4,12})\b/i);
  if (npn?.[1]) {
    const appointment = /\b(appoint|sell policies for|allowed to sell|authorized to sell)\b/i.test(q);
    const marketplace = /\bmarketplace\b/i.test(q);
    const appointer = q.match(/\bfor\s+(.+?)(?:\?|$)/i)?.[1]?.trim();
    const query: InsuranceResearchQuery = {
      mode: appointment || marketplace ? 'evidence' : 'identifier',
      identifier: { type: 'npn', value: npn[1] },
      marketplacePlanYear: q.match(/\b(20\d{2})\b/)?.[1],
      evidenceFamily: appointment ? 'appointment' : marketplace ? 'marketplace' : undefined,
      appointerName: appointment ? appointer : undefined,
      page: 1,
    };
    push('Mode', query.mode);
    push('Identifier', `NPN ${npn[1]} (labeled)`);
    push('Identity rule', 'NPN may be a person or an organization. Class is not assumed.');
    if (appointment) {
      push('Evidence family', 'appointment (indexed relationship only; LOA is not appointment)');
    }
    if (marketplace) {
      push('Evidence family', 'CMS Marketplace overlay (not a state license, not certification)');
      if (query.marketplacePlanYear) push('Plan year', query.marketplacePlanYear);
    }
    return { raw: q, query, interpretation: lines };
  }

  if (/\b(appoint|sell policies for|allowed to sell|authorized to sell)\b/i.test(q) && !/\bevery insurer/i.test(q)) {
    const query = fail(
      'Appointment answers require a labeled NPN and indexed appointment evidence naming the producer/agency and the appointing entity. A license or line of authority does not prove an appointment. Missing appointment evidence is not a finding of “unauthorized.”',
      ['What is an insurance appointment?', 'Find NPN 1234567.'],
    );
    push('Mode', 'fail_closed');
    return { raw: q, query, interpretation: lines };
  }

  const naic = q.match(/\bnaic(?:\s+company)?(?:\s+code)?\s*#?\s*(\d{3,6})\b/i);
  if (naic?.[1]) {
    const query: InsuranceResearchQuery = {
      mode: 'identifier',
      entityClass: 'insurer',
      identifier: { type: 'naic_company_code', value: naic[1] },
      page: 1,
    };
    push('Mode', 'identifier');
    push('Entity', 'Legal insurer');
    push('Identifier', `NAIC company code ${naic[1]}`);
    return { raw: q, query, interpretation: lines };
  }

  if (
    /\bwho is\b/i.test(q) ||
    /\bnamed\b/i.test(q) ||
    (/^\s*find\b/i.test(q) &&
      !/\bagenc/i.test(q) &&
      !/\binsurer/i.test(q) &&
      !/\bproducer/i.test(q) &&
      !/\bagents?\b/i.test(q))
  ) {
    const query = fail(
      'Name is not canonical identity. Ask will not treat a trade name as an NPN, NAIC company code, or unique person/agency. Use a labeled identifier.',
      ['Find NPN 1234567.', 'Find insurer NAIC code 10064.'],
    );
    push('Mode', 'fail_closed');
    return { raw: q, query, interpretation: lines };
  }

  const entityClass = detectClass(q);
  const states = detectStates(q);
  const loas = detectLoas(q);
  const geo = geographyMeaning(q);

  if (/\bhow many\b|\bcount of\b/i.test(q)) {
    if (!entityClass) {
      const query = fail(
        'Counts require an entity class. Agencies, persons, and legal insurers stay separate.',
        ['How many agencies are credentialed in Florida?', 'How many individual producers are credentialed in Florida?'],
      );
      push('Mode', 'fail_closed');
      return { raw: q, query, interpretation: lines };
    }
    if (entityClass === 'person' && !/\bhow many\b/i.test(q)) {
      /* keep */
    }
    const query: InsuranceResearchQuery = {
      mode: 'count',
      entityClass,
      jurisdiction: states[0] ? { state: states[0], meaning: geo } : undefined,
      linesOfAuthority: loas.length ? loas : undefined,
      loaMatch: loas.length > 1 ? 'all' : 'any',
      page: 1,
    };
    push('Mode', 'count');
    push('Entity', entityLabel(entityClass));
    if (query.jurisdiction) push(dimensionLabel(query.jurisdiction.meaning), query.jurisdiction.state);
    push('Grain', grainLabel(entityClass));
    return { raw: q, query, interpretation: lines };
  }

  if (states.length >= 2 && /\bcompar/i.test(q)) {
    const query: InsuranceResearchQuery = {
      mode: 'comparison',
      entityClass: entityClass ?? 'agency',
      jurisdiction: { state: states[0]!, meaning: 'credential_jurisdiction' },
      compareJurisdiction: { state: states[1]!, meaning: 'credential_jurisdiction' },
      aggregateMetric: 'entity_count',
      page: 1,
    };
    push('Mode', 'comparison');
    push('Entity', entityLabel(query.entityClass!));
    push('Metric', 'Indexed credentials / entities');
    push('credential jurisdiction', `${states[0]} vs ${states[1]}`);
    return { raw: q, query, interpretation: lines };
  }

  if (/\bwhich states have the most indexed agency credentials\b/i.test(q)) {
    const query: InsuranceResearchQuery = {
      mode: 'aggregate',
      entityClass: 'agency',
      aggregateMetric: 'credentials_by_state',
      page: 1,
    };
    push('Mode', 'aggregate');
    push('Entity', 'Agency');
    push('Metric', 'Agency credentials by credential jurisdiction');
    return { raw: q, query, interpretation: lines };
  }

  if (/\balso credentialed in another state\b|\bmulti-?state\b/i.test(q)) {
    const query: InsuranceResearchQuery = {
      mode: 'aggregate',
      entityClass: 'agency',
      jurisdiction: states[0] ? { state: states[0], meaning: 'credential_jurisdiction' } : { state: 'FL', meaning: 'credential_jurisdiction' },
      aggregateMetric: 'multi_state_agencies',
      page: 1,
    };
    push('Mode', 'aggregate');
    push('Entity', 'Agency');
    push('Identity', 'NPN / canonical agency ID only — not name merge');
    return { raw: q, query, interpretation: lines };
  }

  if (geo === 'recorded_address_state') {
    const query = fail(
      'Recorded office/address geography is not a national Ask filter in this extract. Ask currently executes credential jurisdiction and (where sourced) domicile — not physical location or service territory.',
      ['Show insurance agencies credentialed in Florida.'],
    );
    push('Mode', 'fail_closed');
    return { raw: q, query, interpretation: lines };
  }

  if (entityClass === 'person' && !npn) {
    const query = fail(
      'Public producer profile pages are not published. Ask can count Florida-credentialed persons or look up a labeled NPN. It will not mass-publish people.',
      ['How many individual producers are credentialed in Florida?', 'Find NPN 1234567.'],
    );
    push('Mode', 'fail_closed');
    return { raw: q, query, interpretation: lines };
  }

  if (/\bmarketplace\b/i.test(q) && !npn) {
    const query = fail(
      'CMS Marketplace observations are a federal overlay and are not a public producer directory. Query a labeled NPN plus plan year, or read the Marketplace limitation. Marketplace evidence is not certification.',
      ['What does Marketplace registration evidence mean?', 'Find NPN 1234567.'],
    );
    push('Mode', 'fail_closed');
    return { raw: q, query, interpretation: lines };
  }

  const query: InsuranceResearchQuery = {
    mode: 'entity',
    entityClass: entityClass ?? 'agency',
    jurisdiction: states[0] ? { state: states[0], meaning: geo } : undefined,
    domicile: geo === 'regulatory_domicile' ? states[0] : undefined,
    credentialStatus: 'current_source',
    linesOfAuthority: loas.length ? loas : undefined,
    loaMatch: /\band\b/.test(q) && loas.length > 1 ? 'all' : 'any',
    loaAsOfficialObservation: states[0] !== 'FL',
    sort: 'name',
    page: safePage,
  };

  push('Mode', 'entity');
  push('Entity', entityLabel(query.entityClass!));
  if (query.jurisdiction) push(dimensionLabel(query.jurisdiction.meaning), query.jurisdiction.state);
  if (loas.length) {
    push('LOA / credential class', loas.join(' + '));
    if (states[0] === 'FL') {
      push(
        'LOA taxonomy',
        'Official LOA observation rows for Florida DFS = 0. Ask may match Florida DFS license-class text as credential class, not a national LOA codebook, and not appointment.',
      );
    } else {
      push('LOA taxonomy', 'Official source LOA observation text where indexed (not appointment).');
    }
  }
  push('Credential status', 'As reported by the source (not TrustHub endorsement)');
  push('Sort', 'Display name, then NPN, then canonical id');
  if (!CREDENTIAL_STATES.includes((states[0] ?? '') as (typeof CREDENTIAL_STATES)[number]) && states[0] && query.entityClass === 'agency') {
    push('Coverage', `${states[0]} may have 0 credential rows in this extract — missing is not “no market.”`);
  }
  return { raw: q, query, interpretation: lines };
}

function definition(raw: string, definitionId: string): ParsedInsuranceAsk {
  const def = ASK_DEFINITIONS[definitionId];
  return {
    raw,
    query: { mode: 'definition', definitionId, page: 1 },
    interpretation: [
      { label: 'Mode', value: 'definition' },
      { label: 'Term', value: def?.title ?? definitionId },
    ],
  };
}

function entityLabel(cls: InsuranceEntityClass): string {
  if (cls === 'person') return 'Producer / individual';
  if (cls === 'insurer') return 'Legal insurer';
  return 'Agency';
}

function dimensionLabel(dim: GeographyDimension): string {
  switch (dim) {
    case 'credential_jurisdiction':
      return 'credential jurisdiction';
    case 'recorded_address_state':
      return 'recorded office state';
    case 'regulatory_domicile':
      return 'regulatory domicile';
    default:
      return 'insurer market geography';
  }
}

function grainLabel(cls: InsuranceEntityClass): string {
  if (cls === 'person') return 'canonical person entities with attached credentials';
  if (cls === 'insurer') return 'canonical legal_insurer entities';
  return 'canonical agency entities with attached state credentials';
}
