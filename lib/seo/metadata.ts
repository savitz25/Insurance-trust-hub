import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL } from '@/lib/constants';
import { brandAsset, BRAND_ICONS, BRAND_LOGO } from '@/lib/brand';

export { SITE_URL };

export const HOMEPAGE_TITLE =
  'Independent Insurance Research | Insurance Trust Hub';
export const HOMEPAGE_DESCRIPTION =
  'Independent insurance research for coverage need, local options, and verification. ACA Marketplace tools, Medicare intelligence, complaint index, and license pathways. No paid placements. No lead selling.';

export const DEFAULT_SITE_DESCRIPTION =
  'Insurance Trust Hub is independent insurance research — Marketplace tools, Medicare intelligence, verification pathways, and verified agency listings only when real inventory exists. Not a policy marketplace.';

export const OG_IMAGE = {
  url: brandAsset(BRAND_LOGO.og),
  width: 1200,
  height: 630,
  alt: 'Insurance Trust Hub — independent licensed agency directory',
} as const;

export function buildOpenGraph(
  overrides: {
    title?: string;
    description?: string;
    url?: string;
    type?: 'website' | 'article';
  } = {}
): NonNullable<Metadata['openGraph']> {
  return {
    title: overrides.title ?? HOMEPAGE_TITLE,
    description: overrides.description ?? HOMEPAGE_DESCRIPTION,
    url: overrides.url ?? SITE_URL,
    siteName: SITE_NAME,
    type: overrides.type ?? 'website',
    locale: 'en-US',
    images: [OG_IMAGE],
  };
}

export function buildTwitter(
  overrides: {
    title?: string;
    description?: string;
  } = {}
): NonNullable<Metadata['twitter']> {
  return {
    card: 'summary_large_image',
    title: overrides.title ?? HOMEPAGE_TITLE,
    description: overrides.description ?? HOMEPAGE_DESCRIPTION,
    images: [OG_IMAGE.url],
  };
}

export interface BuildMetadataOptions {
  title: string;
  description: string;
  path?: string;
  type?: 'website' | 'article';
  noIndex?: boolean;
}

export function buildMetadata(options: BuildMetadataOptions): Metadata {
  const url = options.path ? `${SITE_URL}${options.path}` : SITE_URL;

  return {
    title: options.title,
    description: options.description,
    alternates: { canonical: url },
    openGraph: buildOpenGraph({
      title: options.title,
      description: options.description,
      url,
      type: options.type,
    }),
    twitter: buildTwitter({
      title: options.title,
      description: options.description,
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
  metadataBase: new URL(SITE_URL),
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
