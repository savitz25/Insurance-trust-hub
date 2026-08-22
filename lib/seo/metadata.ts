import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL } from '@/lib/constants';
import { BRAND_ASSET_VERSION, BRAND_ICONS } from '@/lib/brand';
import {
  SHARE_HUB,
  resolveShareOrigin,
  shareOgImageAbsoluteUrl,
} from '@/lib/seo/share-hub';

export { SITE_URL, SHARE_HUB };

export const HOMEPAGE_TITLE =
  'Independent Insurance Research | Insurance Trust Hub';
export const HOMEPAGE_DESCRIPTION =
  'Independent insurance research for coverage need, local options, and verification. ACA Marketplace tools, Medicare intelligence, complaint index, and license pathways. No paid placements. No lead selling.';

export const DEFAULT_SITE_DESCRIPTION =
  'Insurance Trust Hub is independent insurance research — Marketplace tools, Medicare intelligence, verification pathways, and verified agency listings only when real inventory exists. Not a policy marketplace.';

export const OG_IMAGE = {
  url: shareOgImageAbsoluteUrl(resolveShareOrigin(), `v=${BRAND_ASSET_VERSION}`),
  width: SHARE_HUB.ogWidth,
  height: SHARE_HUB.ogHeight,
  alt: SHARE_HUB.ogAlt,
} as const;

export function buildOpenGraph(
  overrides: {
    title?: string;
    description?: string;
    url?: string;
    type?: 'website' | 'article';
    imageUrl?: string;
    imageAlt?: string;
  } = {}
): NonNullable<Metadata['openGraph']> {
  const image = overrides.imageUrl
    ? {
        url: overrides.imageUrl,
        width: SHARE_HUB.ogWidth,
        height: SHARE_HUB.ogHeight,
        alt: overrides.imageAlt || SHARE_HUB.ogAlt,
      }
    : OG_IMAGE;
  return {
    title: overrides.title ?? HOMEPAGE_TITLE,
    description: overrides.description ?? HOMEPAGE_DESCRIPTION,
    url: overrides.url ?? resolveShareOrigin(),
    siteName: SITE_NAME,
    type: overrides.type ?? 'website',
    locale: 'en-US',
    images: [image],
  };
}

export function buildTwitter(
  overrides: {
    title?: string;
    description?: string;
    imageUrl?: string;
    imageAlt?: string;
  } = {}
): NonNullable<Metadata['twitter']> {
  const imageUrl = overrides.imageUrl || OG_IMAGE.url;
  const imageAlt = overrides.imageAlt || SHARE_HUB.ogAlt;
  return {
    card: SHARE_HUB.twitterCard,
    title: overrides.title ?? HOMEPAGE_TITLE,
    description: overrides.description ?? HOMEPAGE_DESCRIPTION,
    images: [{ url: imageUrl, alt: imageAlt }],
  };
}

export interface BuildMetadataOptions {
  title: string;
  description: string;
  path?: string;
  type?: 'website' | 'article';
  noIndex?: boolean;
  imageUrl?: string;
  imageAlt?: string;
}

export function buildMetadata(options: BuildMetadataOptions): Metadata {
  const origin = resolveShareOrigin();
  const url = options.path ? `${origin}${options.path}` : origin;

  return {
    title: options.title,
    description: options.description,
    alternates: { canonical: url },
    openGraph: buildOpenGraph({
      title: options.title,
      description: options.description,
      url,
      type: options.type,
      imageUrl: options.imageUrl,
      imageAlt: options.imageAlt,
    }),
    twitter: buildTwitter({
      title: options.title,
      description: options.description,
      imageUrl: options.imageUrl,
      imageAlt: options.imageAlt,
    }),
    robots: options.noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },
  };
}

export const rootLayoutMetadata: Metadata = {
  metadataBase: new URL(resolveShareOrigin()),
  alternates: { canonical: `${resolveShareOrigin()}/` },
  applicationName: SITE_NAME,
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: 'insurance',
  title: {
    default: HOMEPAGE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_SITE_DESCRIPTION,
  keywords: [
    'insurance agents',
    'insurance agencies',
    'DOI license verification',
    'independent insurance agent',
    'insurance directory',
    'Medicare research',
    'ACA educational tools',
    'insurance trust hub',
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  appleWebApp: {
    capable: true,
    title: 'Insurance HQ',
    statusBarStyle: 'default',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: BRAND_ICONS.faviconIco, sizes: 'any' },
      { url: BRAND_ICONS.favicon16, sizes: '16x16', type: 'image/png' },
      { url: BRAND_ICONS.favicon32, sizes: '32x32', type: 'image/png' },
      { url: BRAND_ICONS.favicon48, sizes: '48x48', type: 'image/png' },
      { url: BRAND_ICONS.android192, sizes: '192x192', type: 'image/png' },
      { url: BRAND_ICONS.android512, sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: BRAND_ICONS.apple, sizes: '180x180', type: 'image/png' }],
    shortcut: [BRAND_ICONS.favicon32],
  },
  manifest: BRAND_ICONS.manifest,
  openGraph: buildOpenGraph(),
  twitter: buildTwitter(),
  robots: {
    index: true,
    follow: true,
  },
};
