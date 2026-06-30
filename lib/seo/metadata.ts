import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL } from '@/lib/constants';

export { SITE_URL };

export const HOMEPAGE_TITLE =
  'Find Trusted Insurance Agents (2026) | Compare Licensed Agencies by State';
export const HOMEPAGE_DESCRIPTION =
  'Compare independent and captive insurance agencies by reviews, specialties, and state licensing. Get free quotes for auto, home, life, and business coverage.';

export const DEFAULT_SITE_DESCRIPTION =
  'Insurance Trust Hub is an independent directory of licensed insurance agencies. Research providers, read verified reviews, and request quotes for auto, home, life, and business insurance.';

export const OG_IMAGE = {
  url: '/brand/insurance-trust-hub-og.png',
  width: 1200,
  height: 630,
  alt: 'Insurance Trust Hub — trusted insurance agency directory',
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
    locale: 'en_US',
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
    'auto insurance quotes',
    'homeowners insurance',
    'independent insurance agent',
    'insurance directory',
    'compare insurance agents',
    'insurance trust hub',
  ],
  authors: [{ name: SITE_NAME }],
  icons: {
    icon: '/brand/insurance-trust-hub-logo.png',
    apple: '/brand/insurance-trust-hub-logo.png',
  },
  openGraph: buildOpenGraph(),
  twitter: buildTwitter(),
  robots: {
    index: true,
    follow: true,
  },
};