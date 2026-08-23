import { SHARE_HUB, isForbiddenShareHost } from '@/lib/seo/share-hub';
import {
  CANONICAL_HOST,
  CANONICAL_ORIGIN,
} from '@/lib/network-discovery/types';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PROVIDER_PATH_RE = /^\/providers\/([a-z0-9]+(?:-[a-z0-9]+)*)$/;
const CARRIER_PATH_RE = /^\/carriers\/([a-z0-9]+(?:-[a-z0-9]+)*)$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

export function providerProfileUrl(slug: string): string {
  return `${CANONICAL_ORIGIN}/providers/${slug}`;
}

export function carrierProfileUrl(slug: string): string {
  return `${CANONICAL_ORIGIN}/carriers/${slug}`;
}

export type ProfileUrlKind = 'provider' | 'carrier';

export type ProfileUrlValidation = {
  ok: boolean;
  kind: ProfileUrlKind | null;
  slug: string | null;
  reasons: string[];
};

/**
 * Fail-closed canonical host + path check.
 * Rejects localhost, Vercel hosts, HTTP, foreign TrustHub hosts,
 * malformed paths, and unsafe redirects (non-canonical origin).
 */
export function validateCanonicalProfileUrl(
  url: string,
  expectedKind?: ProfileUrlKind
): ProfileUrlValidation {
  const reasons: string[] = [];
  const raw = (url || '').trim();
  if (!raw) {
    return { ok: false, kind: null, slug: null, reasons: ['empty_url'] };
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, kind: null, slug: null, reasons: ['malformed_url'] };
  }

  if (parsed.protocol !== 'https:') {
    reasons.push('http_or_non_https');
  }
  if (parsed.username || parsed.password) {
    reasons.push('userinfo_not_allowed');
  }
  if (parsed.port) {
    reasons.push('non_default_port');
  }
  if (parsed.search || parsed.hash) {
    reasons.push('query_or_fragment_not_allowed');
  }

  const host = parsed.hostname.toLowerCase();
  if (host !== CANONICAL_HOST || host !== SHARE_HUB.host) {
    reasons.push('wrong_host');
  }
  if (isForbiddenShareHost(host)) {
    reasons.push('forbidden_host');
  }
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.vercel.app')) {
    reasons.push('localhost_or_vercel');
  }

  const path = parsed.pathname.replace(/\/+$/, '') || '/';
  const providerMatch = PROVIDER_PATH_RE.exec(path);
  const carrierMatch = CARRIER_PATH_RE.exec(path);
  let kind: ProfileUrlKind | null = null;
  let slug: string | null = null;

  if (providerMatch) {
    kind = 'provider';
    slug = providerMatch[1];
  } else if (carrierMatch) {
    kind = 'carrier';
    slug = carrierMatch[1];
  } else {
    reasons.push('malformed_profile_path');
  }

  if (expectedKind && kind && kind !== expectedKind) {
    reasons.push('unexpected_profile_kind');
  }

  return { ok: reasons.length === 0 && Boolean(kind && slug), kind, slug, reasons };
}
