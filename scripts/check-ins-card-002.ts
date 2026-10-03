/**
 * INS-CARD-002 — consumer Ask card presentation.
 * Fixture markup only. No network and no production names.
 *   npm run check:ins-card-002
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AskInsuranceResultView, isResolvedSimpleNameIdentity } from '../components/ask-insurance-result';
import { CARD_SCROLL_CANCEL_PX, pointerMovedPastCardScroll } from '../components/ask-result-card-gesture';
import { INSURANCE_ASK_CONTRACT } from '../lib/insurance-ask/contract';
import type { AskCard, InsuranceAskResult } from '../lib/insurance-ask/execute';

let pass = 0, fail = 0;
function check(name: string, fn: () => void) {
  try { fn(); pass += 1; console.log('PASS', name); }
  catch (e) { fail += 1; console.error('FAIL', name, e instanceof Error ? e.message : e); }
}

function card(partial: Partial<AskCard> & Pick<AskCard, 'entityId' | 'displayName'>): AskCard {
  return {
    entityClass: 'agency',
    npn: null,
    naicCode: null,
    credentialJurisdiction: null,
    credentialStatus: null,
    licenseNumber: null,
    licenseClass: null,
    loas: [],
    sourceDataset: null,
    sourceObservedAt: null,
    href: null,
    publicationNote: null,
    whyMatched: 'Name candidate: requested "american" matches source legal_name. Full technical sentence.',
    ...partial,
  };
}

function result(partial: Partial<InsuranceAskResult> & Pick<InsuranceAskResult, 'results'>): InsuranceAskResult {
  const query = {
    mode: 'entity' as const,
    intent: 'NAME_IDENTITY' as const,
    requestedTask: 'identity' as const,
    nameQuery: 'american',
    page: 1,
    coverageState: 'PARTIAL' as const,
    ...partial.parsed?.query,
  };
  return {
    contract: INSURANCE_ASK_CONTRACT,
    queryText: 'american',
    parsed: {
      raw: 'american',
      interpretation: [{ label: 'Research task', value: 'Identity' }, { label: 'Name', value: 'american' }],
      query,
    },
    resultType: query.mode,
    entityClass: 'agency',
    counts: [{ label: 'Matching research identities', value: partial.results.length || 1, grain: 'Bounded candidate identities; not an exhaustive market count' }],
    pagination: { page: 1, pageSize: 20, total: partial.results.length, hasMore: false },
    provenance: {
      sourceFamily: 'fixture',
      geographyMeaning: 'Not geography-filtered',
      officialAsOf: 'fixture',
      grain: 'fixture',
      exclusions: [],
    },
    limitations: ['Person, agency, and legal insurer stay separate classes.'],
    elapsedMs: 1,
    coverageState: query.coverageState ?? 'PARTIAL',
    terminalState: 'NEEDS_CLARIFICATION',
    ...partial,
    parsed: {
      raw: partial.parsed?.raw ?? 'american',
      interpretation: partial.parsed?.interpretation ?? [{ label: 'Research task', value: 'Identity' }, { label: 'Name', value: 'american' }],
      query,
    },
  };
}

const bridged = card({
  entityId: 'first-american',
  displayName: '1ST AMERICAN ESTATE PLANNING, LLC',
  npn: '10678673',
  href: '/providers/1st-american-estate-planning-llc',
  selectionHref: '/ask?q=american&selected=first-american',
  recordedPlace: 'Clearwater, FL',
  publicPhone: '(727) 555-0100',
  publicEmail: 'hello@1st-american.example',
  credentialFacts: ['Massachusetts credential: Active', 'Texas General Lines Agency', 'Florida agency credential'],
  credentialJurisdiction: 'MA',
  matchEvidence: {
    method: 'contains',
    field: 'legal_name',
    value: '1ST AMERICAN ESTATE PLANNING, LLC',
    requested: 'american',
    entityId: 'first-american',
    entityClass: 'agency',
    source: 'fixture',
    normalization: [],
  },
});

const unbridged = card({
  entityId: 'affordable',
  displayName: 'AFFORDABLE AMERICAN INS, INC.',
  npn: '8331232',
  href: null,
  selectionHref: '/ask?q=american&selected=affordable',
  credentialStatus: 'active',
  credentialJurisdiction: 'FL',
  loas: ['Property', 'Casualty'],
  whyMatched: 'Name candidate: requested "american" matches source legal_name. Unbridged technical sentence.',
  matchEvidence: {
    method: 'contains',
    field: 'display_name',
    value: 'AFFORDABLE AMERICAN INS, INC.',
    requested: 'american',
    entityId: 'affordable',
    entityClass: 'agency',
    source: 'fixture',
    normalization: [],
  },
});

function articles(html: string): string[] {
  return [...html.matchAll(/<article\b[^>]*>/g)].map((match) => match[0]);
}

check('a touch scroll past 8px cancels the card open and a tap does not', () => {
  assert.equal(CARD_SCROLL_CANCEL_PX, 8);
  assert.equal(pointerMovedPastCardScroll(0, 0, 8, 0), false);
  assert.equal(pointerMovedPastCardScroll(0, 0, 0, 8), false);
  assert.equal(pointerMovedPastCardScroll(4, 4, 4, 4), false);
  assert.equal(pointerMovedPastCardScroll(0, 0, 9, 0), true);
  assert.equal(pointerMovedPastCardScroll(10, 20, 10, 29), true);
});

check('a profile card is interactive and an unlinked card is not', () => {
  const html = renderToStaticMarkup(createElement(AskInsuranceResultView, {
    result: result({ results: [bridged, unbridged], candidateSelection: true, terminalState: 'NEEDS_CLARIFICATION' }),
  }));
  const [profile, plain] = articles(html);
  assert.ok(profile && plain);
  assert.match(profile!, /data-ask-card-nav="profile"/);
  assert.match(profile!, /cursor-pointer/);
  assert.match(profile!, /hover:border-\[#0A2540\]\/25/);
  assert.match(profile!, /hover:bg-\[#F8FAFC\]/);
  assert.match(profile!, /hover:shadow-md/);
  assert.match(profile!, /shadow-sm/);
  assert.match(profile!, /focus-within:ring-2/);
  assert.match(profile!, /focus-within:ring-inset/);
  assert.match(profile!, /motion-reduce:transition-none/);
  assert.match(profile!, /touch-pan-y/);
  assert.doesNotMatch(profile!, /hover:scale|hover:border-2|translate-/);
  assert.match(plain!, /data-ask-card-nav="none"/);
  assert.doesNotMatch(plain!, /cursor-pointer|hover:shadow-md|hover:border|hover:bg-/);
  const profileHtml = html.slice(html.indexOf('<article'), html.indexOf('<article', html.indexOf('<article') + 1));
  const plainHtml = html.slice(html.indexOf('<article', html.indexOf('<article') + 1));
  assert.ok(profileHtml.indexOf('1ST AMERICAN ESTATE PLANNING, LLC') < profileHtml.indexOf('>Agency<'));
  assert.ok(profileHtml.indexOf('>Agency<') < profileHtml.indexOf('Clearwater, FL'));
  assert.ok(profileHtml.indexOf('Clearwater, FL') < profileHtml.indexOf('10678673'));
  assert.ok(profileHtml.indexOf('Credential evidence') < profileHtml.indexOf('Massachusetts credential: Active'));
  assert.ok(profileHtml.indexOf('Florida agency credential') < profileHtml.indexOf('Phone: '));
  assert.match(profileHtml, /Phone: .*\(727\) 555-0100/);
  assert.match(profileHtml, /hello@1st-american\.example/);
  assert.ok(profileHtml.indexOf('Matched by company name and NPN.') < profileHtml.indexOf('View company profile →'));
  assert.ok(profileHtml.indexOf('View company profile →') < profileHtml.indexOf('Select this identity and continue'));
  assert.ok(profileHtml.indexOf('How we matched this result') < profileHtml.indexOf('Trace this result'));
  assert.ok(profileHtml.indexOf('Trace this result') < profileHtml.indexOf('Why this matched'));
  assert.ok(profileHtml.indexOf('Why this matched') < profileHtml.indexOf('Full technical sentence'));
  assert.doesNotMatch(profileHtml, /text-sky-800[^"]*">\s*Trace this result|Trace this result<\/summary>/);
  assert.match(profileHtml, /tabindex="-1"/);
  assert.match(profileHtml, /aria-hidden="true"/);
  assert.match(profileHtml, /data-ask-card-surface/);
  assert.match(profileHtml, /data-card-control/);
  const profileAction = profileHtml.match(/<a\b[^>]*>View company profile →<\/a>/)?.[0] ?? '';
  const selectAction = profileHtml.match(/<a\b[^>]*>Select this identity and continue<\/a>/)?.[0] ?? '';
  assert.match(profileAction, /bg-\[#0A2540\]/);
  assert.doesNotMatch(selectAction, /bg-\[#0A2540\]|text-sky-800/);
  assert.doesNotMatch(plainHtml, /View company profile|data-ask-card-surface|href="\/providers\//);
  assert.match(plainHtml, /AFFORDABLE AMERICAN INS, INC\./);
  assert.match(plainHtml, /Select this identity and continue/);
  assert.match(plainHtml, /Source credential status/);
  assert.ok(plainHtml.indexOf('Lines of authority') < plainHtml.indexOf('How we matched this result'));
  assert.ok(plainHtml.indexOf('How we matched this result') < plainHtml.indexOf('Unbridged technical sentence'));
  assert.match(html, /We interpreted your question as/);
  assert.match(html, /Coverage: PARTIAL/);
  assert.match(html, /<h2[^>]*>Count<\/h2>/);
});

check('a resolved company-name selection leads with the company', () => {
  const selected = result({
    results: [{ ...bridged, selectionHref: undefined }],
    terminalState: 'IDENTITY_FOUND',
    counts: [{ label: 'Matching research identities', value: 1, grain: 'Server-revalidated selected source identity' }],
    parsed: {
      raw: 'american',
      interpretation: [{ label: 'Research task', value: 'Identity' }],
      query: {
        mode: 'entity',
        intent: 'NAME_IDENTITY',
        requestedTask: 'identity',
        nameQuery: 'american',
        page: 1,
        coverageState: 'PARTIAL',
        selectedEntity: 'first-american',
      },
    },
  });
  assert.equal(isResolvedSimpleNameIdentity(selected), true);
  const html = renderToStaticMarkup(createElement(AskInsuranceResultView, { result: selected }));
  assert.doesNotMatch(html, /We interpreted your question as/);
  assert.doesNotMatch(html, /Coverage:/);
  assert.doesNotMatch(html, /<h2[^>]*>Count<\/h2>/);
  assert.doesNotMatch(html, /Change interpretation/);
  assert.ok(html.indexOf('1ST AMERICAN ESTATE PLANNING, LLC') < html.indexOf('Trace this query'));
  assert.match(html, /View company profile →/);
  assert.match(html, /How we matched this result/);
  assert.match(html, /Why this matched/);
  assert.doesNotMatch(html, /Select this identity and continue/);
});

check('counts, evidence, comparisons, and unresolved names keep the research sections', () => {
  const count = result({
    results: [],
    counts: [{ label: 'Indexed agencies', value: 12, grain: 'Credentialed agencies; not a market census' }],
    terminalState: 'RESULTS',
    parsed: {
      raw: 'how many insurance agencies in Florida',
      interpretation: [{ label: 'Research task', value: 'Count' }],
      query: { mode: 'count', intent: 'COHORT_DISCOVERY', requestedTask: 'identity', page: 1, coverageState: 'KNOWN' },
    },
  });
  assert.equal(isResolvedSimpleNameIdentity(count), false);
  const countHtml = renderToStaticMarkup(createElement(AskInsuranceResultView, { result: count }));
  assert.match(countHtml, /We interpreted your question as/);
  assert.match(countHtml, /Coverage: KNOWN/);
  assert.match(countHtml, /<h2[^>]*>Count<\/h2>/);
  assert.match(countHtml, /Indexed agencies/);

  const evidence = result({
    results: [bridged],
    terminalState: 'EVIDENCE_RESULT',
    parsed: {
      raw: 'american credential evidence',
      interpretation: [{ label: 'Research task', value: 'Evidence' }],
      query: {
        mode: 'evidence',
        intent: 'EVIDENCE',
        requestedTask: 'credential',
        page: 1,
        coverageState: 'PARTIAL',
        selectedEntity: 'first-american',
        evidenceFamily: 'credential',
      },
    },
  });
  assert.equal(isResolvedSimpleNameIdentity(evidence), false);
  const evidenceHtml = renderToStaticMarkup(createElement(AskInsuranceResultView, { result: evidence }));
  assert.match(evidenceHtml, /We interpreted your question as/);
  assert.match(evidenceHtml, /Coverage: PARTIAL/);

  const comparison = result({
    results: [bridged, unbridged],
    terminalState: 'RESULTS',
    parsed: {
      raw: 'compare american agencies',
      interpretation: [{ label: 'Research task', value: 'Comparison' }],
      query: { mode: 'comparison', intent: 'COHORT_DISCOVERY', page: 1, coverageState: 'PARTIAL' },
    },
  });
  assert.equal(isResolvedSimpleNameIdentity(comparison), false);
  assert.match(renderToStaticMarkup(createElement(AskInsuranceResultView, { result: comparison })), /We interpreted your question as/);

  const ambiguous = result({
    results: [bridged, unbridged],
    candidateSelection: true,
    terminalState: 'NEEDS_CLARIFICATION',
  });
  assert.equal(isResolvedSimpleNameIdentity(ambiguous), false);
  assert.match(renderToStaticMarkup(createElement(AskInsuranceResultView, { result: ambiguous })), /Select the source identity you mean/);
});

check('the card shell keeps the scroll guard and does not shift layout', () => {
  const root = process.cwd();
  const shell = fs.readFileSync(path.join(root, 'components/ask-result-card.tsx'), 'utf8');
  const view = fs.readFileSync(path.join(root, 'components/ask-insurance-result.tsx'), 'utf8');
  assert.match(shell, /pointerMovedPastCardScroll/);
  assert.match(shell, /preventDefault/);
  assert.match(shell, /motion-reduce:transition-none/);
  assert.match(shell, /tabIndex=\{-1\}/);
  assert.doesNotMatch(shell, /hover:scale|scale-|translate-|useRouter|window\.location/);
  assert.match(view, /Why this matched/);
  assert.match(view, /Trace this result/);
  assert.match(view, /How we matched this result/);
  assert.doesNotMatch(view, /font-semibold text-sky-800">Trace this result/);
});

console.log(JSON.stringify({ ticket: 'INS-CARD-002', pass, fail }));
if (fail) process.exitCode = 1;
