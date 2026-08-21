import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import { getCarrierBySlug } from '@/lib/carriers/registry';
import { getDestinationBySlug, getDestinationCity } from '@/lib/destinations/data';
import { getAcaMarketplaceGuide } from '@/lib/guides/aca-marketplace-guides';
import { renderInsuranceShareImage } from '@/lib/og/insurance-share-card';
import { canShowAsVerified, resolveProviderTrustState } from '@/lib/insurance/trust/provider-trust-state';
import { getProviderBySlug } from '@/lib/providers/queries';
import {
  insuranceCarrierShareModel,
  insuranceGuideShareModel,
  insurancePlaceShareModel,
  insuranceProviderShareModel,
  type InsuranceShareCardModel,
} from '@/lib/seo/share-card-model';

const PNG_HEADERS = {
  'Content-Type': 'image/png',
  'Cache-Control': 'public, max-age=3600, s-maxage=3600',
};

export function insuranceFallbackPng(): NextResponse {
  const buf = readFileSync(join(process.cwd(), 'public/brand/insurance-trust-hub-og.png'));
  return new NextResponse(buf, { status: 200, headers: PNG_HEADERS });
}

export function shareOgHead(): NextResponse {
  return new NextResponse(null, { status: 200, headers: { 'Content-Type': 'image/png' } });
}

export function renderInsuranceCardOrFallback(model: InsuranceShareCardModel | null) {
  if (!model) return insuranceFallbackPng();
  try {
    return renderInsuranceShareImage(model);
  } catch {
    return insuranceFallbackPng();
  }
}

export function resolveInsuranceCarrierCard(slug: string): InsuranceShareCardModel | null {
  const entry = getCarrierBySlug(decodeURIComponent(String(slug ?? '').trim()));
  if (!entry?.displayName) return null;
  return insuranceCarrierShareModel(entry.displayName);
}

export async function resolveInsuranceProviderCard(slug: string): Promise<InsuranceShareCardModel | null> {
  try {
    const provider = await getProviderBySlug(decodeURIComponent(String(slug ?? '').trim()));
    if (!provider?.name) return null;
    if (!canShowAsVerified(resolveProviderTrustState(provider))) return null;
    return insuranceProviderShareModel({
      name: provider.name,
      city: provider.city,
      state: provider.state,
    });
  } catch {
    return null;
  }
}

export function resolveInsuranceGuideCard(slug: string): InsuranceShareCardModel | null {
  const guide = getAcaMarketplaceGuide(decodeURIComponent(String(slug ?? '').trim()));
  if (!guide) return null;
  return insuranceGuideShareModel({ title: guide.h1 || guide.title, locationLabel: guide.locationLabel });
}

export function resolveInsuranceDestinationCard(stateSlug: string, citySlug?: string): InsuranceShareCardModel | null {
  if (citySlug) {
    const data = getDestinationCity(stateSlug, citySlug);
    if (!data) return null;
    return insurancePlaceShareModel({
      placeName: `${data.city.name}, ${data.state.code}`,
      stateName: data.state.name,
    });
  }
  const dest = getDestinationBySlug(stateSlug);
  if (!dest) return null;
  return insurancePlaceShareModel({ placeName: `${dest.name} insurance`, stateName: dest.name });
}
