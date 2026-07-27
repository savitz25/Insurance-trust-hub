/**
 * PPEF + Opt Out lookup (server-side).
 * Opt Out list ships in-repo; full PPEF index is optional/gitignored.
 */

import fs from 'fs';
import path from 'path';
import optOutNpis from '@/lib/insurance/cms/data/opt-out-npis.json';
import ppefMeta from '@/lib/insurance/cms/data/ppef-meta.json';
import type { CmsParticipationStatus } from '@/lib/insurance/cms/types';

const OPT_OUT = new Set(optOutNpis as string[]);

let ppefCache: Set<string> | null | undefined;

function loadPpefIndex(): Set<string> | null {
  if (ppefCache !== undefined) return ppefCache;
  try {
    const filePath = path.join(
      process.cwd(),
      'lib',
      'insurance',
      'cms',
      'data',
      'ppef-active-npis.json'
    );
    if (!fs.existsSync(filePath) || process.env.PPEF_INDEX_ENABLED === '0') {
      ppefCache = null;
      return null;
    }
    const arr = JSON.parse(fs.readFileSync(filePath, 'utf8')) as string[];
    ppefCache = new Set(arr);
    return ppefCache;
  } catch {
    ppefCache = null;
    return null;
  }
}

export function normalizeNpi(npi: string | null | undefined): string | null {
  if (!npi) return null;
  const digits = String(npi).replace(/\D/g, '');
  return digits.length === 10 ? digits : null;
}

export function isActivelyEnrolledInMedicareFfs(
  npi: string | null | undefined
): boolean | null {
  const id = normalizeNpi(npi);
  if (!id) return null;
  const index = loadPpefIndex();
  if (!index) return null;
  return index.has(id);
}

export type PpefLookupResult = {
  npi: string | null;
  status: CmsParticipationStatus;
  label: string;
  notes: string;
  optedOut: boolean;
  ppefActive: boolean | null;
  dataSourceLabel: string;
  lastCmsUpdate: string;
};

export function lookupNpiEnrollment(npi: string | null | undefined): PpefLookupResult | null {
  const id = normalizeNpi(npi);
  if (!id) return null;

  const optedOut = OPT_OUT.has(id);
  const ppefActive = isActivelyEnrolledInMedicareFfs(id);
  const lastCmsUpdate =
    (ppefMeta as { syncedAt?: string }).syncedAt ?? '2026-07-27T00:00:00.000Z';

  if (optedOut) {
    return {
      npi: id,
      status: 'inactive',
      label: 'Opted out of Medicare',
      notes:
        'NPI appears on the CMS Opt Out Affidavits public file (June 2026). Confirm current status on CMS tools before enrollment decisions.',
      optedOut: true,
      ppefActive,
      dataSourceLabel: 'CMS Opt Out Affidavits (June 2026) · PPEF when available',
      lastCmsUpdate,
    };
  }

  if (ppefActive === true) {
    return {
      npi: id,
      status: 'active',
      label: 'Active Medicare FFS enrollment (PPEF)',
      notes:
        'NPI found in CMS Medicare Fee-For-Service Public Provider Enrollment (PPEF) extract dated 2026-07-17. Indicates approval to bill Medicare FFS — not a rating of insurance-agent quality.',
      optedOut: false,
      ppefActive: true,
      dataSourceLabel: 'CMS PPEF Enrollment Extract 2026.07.17 · Opt Out cross-check',
      lastCmsUpdate,
    };
  }

  if (ppefActive === false) {
    return {
      npi: id,
      status: 'not_found',
      label: 'Not found in PPEF extract',
      notes:
        'NPI was not present in the loaded PPEF index and is not on the Opt Out list. Verify on CMS NPPES / PECOS tools.',
      optedOut: false,
      ppefActive: false,
      dataSourceLabel: 'CMS PPEF Enrollment Extract 2026.07.17 · Opt Out cross-check',
      lastCmsUpdate,
    };
  }

  return {
    npi: id,
    status: 'pending',
    label: 'NPI on file · PPEF index not loaded',
    notes:
      'NPI is present and not on the CMS Opt Out list. Full PPEF membership check requires optional ppef-active-npis.json.',
    optedOut: false,
    ppefActive: null,
    dataSourceLabel: 'CMS Opt Out Affidavits (June 2026) · PPEF index optional',
    lastCmsUpdate,
  };
}

export const PPEF_DATASET_META = {
  optOutCount: OPT_OUT.size,
  optOutVintage: 'June 2026',
  ppefMeta,
};
