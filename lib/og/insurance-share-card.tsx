import type { InsuranceShareCardModel } from '@/lib/seo/share-card-model';
import { NETWORK_OG_SIZE, renderNetworkShareImage } from './network-share-card';

export const INSURANCE_OG_SIZE = NETWORK_OG_SIZE;
export const INSURANCE_OG_CONTENT_TYPE = 'image/png';
const CONFIG = { hub: 'INSURANCE TRUST HUB', descriptor: 'Independent Insurance Research', domain: 'insurancetrusthub.com', accent: '#0284C7' };

export function renderInsuranceShareImage(model: InsuranceShareCardModel) {
  return renderNetworkShareImage(CONFIG, model);
}

export function renderInsuranceFallbackImage() {
  return renderNetworkShareImage(CONFIG);
}
