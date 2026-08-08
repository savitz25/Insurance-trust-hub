'use client';

import { useEffect } from 'react';
import { trackMarketplaceEvent } from '@/lib/marketplace/analytics';

/** Lightweight page-open analytics for Medicare intelligence surfaces. */
export function MedicareCountyOpenBeacon({
  slug,
  path,
}: {
  slug: string;
  path: string;
}) {
  useEffect(() => {
    trackMarketplaceEvent('medicare_county_opened', { slug, path });
  }, [slug, path]);
  return null;
}

export function MedicareContractOpenBeacon({ contractId }: { contractId: string }) {
  useEffect(() => {
    trackMarketplaceEvent('medicare_plan_intelligence_opened', { contractId });
  }, [contractId]);
  return null;
}
