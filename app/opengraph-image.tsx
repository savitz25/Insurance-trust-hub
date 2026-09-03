import { renderInsuranceFallbackImage } from '@/lib/og/insurance-share-card';

export const runtime = 'edge';
export const alt = 'Insurance Trust Hub — Independent Insurance Research';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() { return renderInsuranceFallbackImage(); }
