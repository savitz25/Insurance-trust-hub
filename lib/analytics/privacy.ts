/**
 * Insurance Trust Hub analytics privacy.
 * Raw search text never leaves the browser. URL fields are sanitized in before_send.
 */

export const FREE_TEXT_QUERY_KEYS = [
  'q',
  'query',
  'question',
  'search',
  'text',
  'keyword',
  'keywords',
  'term',
  'terms',
  'prompt',
  'message',
  'note',
  'notes',
  'body',
  'comment',
  'comments',
  'feedback',
  'requestedplace',
  'requestedlocation',
  'location',
  'placename',
] as const;

/** Structured filters. Values are still dropped when they are long enough to carry a question. */
export const STRUCTURED_QUERY_KEYS = [
  'state',
  'entity',
  'loa',
  'evidence',
  'type',
  'specialty',
  'verified',
  'appointments',
  'minrating',
  'page',
  'limit',
  'from',
  'zip',
  'selected',
  'profile',
  'year',
  'county',
  'view',
  'sort',
  'tab',
  'mode',
  'src',
  'journey',
  'intent',
  'status',
  'layout',
  'offset',
  'hub',
  'surface',
] as const;

const SENSITIVE_QUERY_KEY_PATTERN = /token|email|password|note|error|handoff|secret|otp|query|question|search|prompt|message|ssn|phone/i;

const FORBIDDEN_EVENT_KEYS = [
  'q',
  'query',
  'question',
  'email',
  'name',
  'first_name',
  'last_name',
  'phone',
  'address',
  'ssn',
  'password',
  'token',
  'authorization',
  'cookie',
  'nmls',
  'usdot',
  'ccn',
  'crd',
  'npn',
  'note',
  'notes',
  'body',
  'message',
  'search',
  'href',
  'url',
  'auth_error',
  'error',
  'error_message',
  'error_description',
  'handoff',
] as const;

/** SDK ingest fields. Stripping `token` makes posthog-js drop the event. */
export const POSTHOG_RESERVED_KEYS = [
  'token',
  'distinct_id',
  'timestamp',
  'uuid',
  'event',
  'offset',
  'api_key',
] as const;

const PAGE_URL_PROPERTY_KEYS = [
  '$current_url',
  '$referrer',
  '$pathname',
  '$initial_current_url',
  '$session_entry_url',
  '$entry_current_url',
  '$initial_referrer',
  '$session_entry_referrer',
  '$prev_pageview_url',
] as const;

const AUTOCAPTURE_URL_KEYS = [
  '$external_click_url',
  '$el_href',
  'attr__href',
  'attr__action',
  'attr__formaction',
  'attr__src',
] as const;

const ANALYTICS_BASE = 'https://www.insurancetrusthub.com';

function decodePart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function isPosthogReservedKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (lower.startsWith('$')) return true;
  return (POSTHOG_RESERVED_KEYS as readonly string[]).includes(lower);
}

export function shouldStripQueryParam(key: string, value: string | null): boolean {
  const lower = decodePart(key).trim().toLowerCase();
  if ((FREE_TEXT_QUERY_KEYS as readonly string[]).includes(lower)) return true;
  if ((STRUCTURED_QUERY_KEYS as readonly string[]).includes(lower)) {
    return Boolean(value && decodePart(value).length > 64);
  }
  if (SENSITIVE_QUERY_KEY_PATTERN.test(lower)) return true;
  if (value == null) return false;
  const decoded = decodePart(value).replace(/\+/g, ' ');
  return /\s/.test(decoded) || decoded.length > 32;
}

export function stateCode(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const upper = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(upper) ? upper : undefined;
}

export function boundedToken(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return /^[A-Za-z0-9_.:-]{1,40}$/.test(trimmed) ? trimmed : undefined;
}

export function sanitizeAnalyticsUrl(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const absolute = /^https?:\/\//i.test(trimmed);
  const rooted = trimmed.startsWith('/');
  if (!absolute && !rooted) {
    return trimmed.split('#')[0]?.split('?')[0] || undefined;
  }
  try {
    const url = new URL(trimmed, ANALYTICS_BASE);
    for (const key of [...url.searchParams.keys()]) {
      const values = url.searchParams.getAll(key);
      if (values.some((value) => shouldStripQueryParam(key, value))) url.searchParams.delete(key);
    }
    url.hash = '';
    url.username = '';
    url.password = '';
    const search = url.searchParams.toString();
    return `${url.origin}${url.pathname}${search ? `?${search}` : ''}`;
  } catch {
    const stripped = raw.split('#')[0]?.split('?')[0];
    return stripped || undefined;
  }
}

export function sanitizeAnalyticsPath(raw: string): string {
  const noHash = raw.split('#')[0] ?? '';
  const queryIndex = noHash.indexOf('?');
  if (queryIndex === -1) return noHash || '/';
  const path = noHash.slice(0, queryIndex) || '/';
  const params = new URLSearchParams(noHash.slice(queryIndex + 1));
  for (const key of [...params.keys()]) {
    const values = params.getAll(key);
    if (values.some((value) => shouldStripQueryParam(key, value))) params.delete(key);
  }
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

export function redactSensitiveParamsInText(text: string): string {
  return text.replace(/([?&]|&amp;)([^=&;"'\s]+)=([^&;"'\s]*)/g, (match, lead: string, key: string) => {
    const decoded = decodePart(key);
    return shouldStripQueryParam(decoded, decodePart(match.split('=').slice(1).join('=')))
      ? `${lead}${key}=[redacted]`
      : match;
  });
}

function sanitizeUrlProperties(target: Record<string, unknown>): void {
  for (const key of PAGE_URL_PROPERTY_KEYS) {
    const value = target[key];
    if (typeof value !== 'string') continue;
    if (key === '$pathname') target[key] = sanitizeAnalyticsPath(value);
    else target[key] = sanitizeAnalyticsUrl(value);
  }
}

function sanitizeAutocaptureUrls(properties: Record<string, unknown>): void {
  for (const key of AUTOCAPTURE_URL_KEYS) {
    if (typeof properties[key] === 'string') {
      properties[key] = sanitizeAnalyticsUrl(properties[key] as string) ?? '[redacted]';
    }
  }
  if (typeof properties.$elements_chain === 'string') {
    properties.$elements_chain = redactSensitiveParamsInText(properties.$elements_chain);
  }
  if (typeof properties.$input_value === 'string') delete properties.$input_value;
  if (Array.isArray(properties.$elements)) {
    for (const element of properties.$elements) {
      if (!element || typeof element !== 'object') continue;
      const record = element as Record<string, unknown>;
      for (const key of AUTOCAPTURE_URL_KEYS) {
        if (typeof record[key] === 'string') {
          record[key] = sanitizeAnalyticsUrl(record[key] as string) ?? '[redacted]';
        }
      }
      if (typeof record.href === 'string') record.href = sanitizeAnalyticsUrl(record.href) ?? '[redacted]';
      if (typeof record.text === 'string' && record.tag_name === 'input') delete record.text;
      if (typeof record.attr__value === 'string') delete record.attr__value;
    }
  }
}

function sanitizeReplaySnapshotHrefs(node: unknown, depth = 0): void {
  if (depth > 8 || node == null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) sanitizeReplaySnapshotHrefs(item, depth + 1);
    return;
  }
  const obj = node as Record<string, unknown>;
  if (typeof obj.href === 'string') {
    const cleaned = sanitizeAnalyticsUrl(obj.href);
    if (cleaned) obj.href = cleaned;
  }
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') sanitizeReplaySnapshotHrefs(value, depth + 1);
  }
}

function stripForbidden(properties: Record<string, unknown>): void {
  for (const key of Object.keys(properties)) {
    if (isPosthogReservedKey(key)) continue;
    if ((FORBIDDEN_EVENT_KEYS as readonly string[]).includes(key.toLowerCase() as (typeof FORBIDDEN_EVENT_KEYS)[number])) {
      delete properties[key];
    }
  }
}

export function sanitizePageviewProperties(properties: Record<string, unknown>): Record<string, unknown> {
  sanitizeUrlProperties(properties);
  for (const bag of ['$set', '$set_once']) {
    const nested = properties[bag];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      sanitizeUrlProperties(nested as Record<string, unknown>);
    }
  }
  sanitizeReplaySnapshotHrefs(properties.$snapshot_data);
  sanitizeAutocaptureUrls(properties);
  const path = String(properties.$pathname || properties.$current_url || '');
  if (path.includes('/ask') || path.includes('/search')) {
    properties.$title = 'Insurance Trust Hub';
    properties.title = 'Insurance Trust Hub';
    properties.$document_title = 'Insurance Trust Hub';
  }
  stripForbidden(properties);
  return properties;
}

export function sanitizeCaptureResult<
  T extends {
    properties?: Record<string, unknown>;
    $set?: Record<string, unknown>;
    $set_once?: Record<string, unknown>;
  } | null,
>(event: T): T {
  if (!event) return event;
  if (event.properties) sanitizePageviewProperties(event.properties);
  if (event.$set) sanitizeUrlProperties(event.$set);
  if (event.$set_once) sanitizeUrlProperties(event.$set_once);
  return event;
}

export function sanitizeCapturedNetworkRequest<T extends { name?: string }>(request: T): T {
  if (typeof request.name === 'string') {
    request.name = sanitizeAnalyticsUrl(request.name) ?? request.name.split('?')[0] ?? request.name;
  }
  return request;
}

export function maskReplayAttribute(name: string, value: string): string {
  const lower = name.toLowerCase();
  if (lower === 'value' || lower === 'placeholder') return '';
  if (lower === 'href' || lower === 'src' || lower === 'action' || lower === 'formaction') {
    return sanitizeAnalyticsUrl(value) ?? '';
  }
  return value;
}

export function stripForbiddenProperties(
  props: Record<string, unknown> | undefined,
): Record<string, string | number | boolean> {
  const cleaned: Record<string, string | number | boolean> = {};
  if (!props) return cleaned;
  for (const [key, value] of Object.entries(props)) {
    if (isPosthogReservedKey(key)) continue;
    const lower = key.toLowerCase();
    if ((FORBIDDEN_EVENT_KEYS as readonly string[]).includes(lower as (typeof FORBIDDEN_EVENT_KEYS)[number])) continue;
    if (/email|password|token|ssn|phone|query|question/.test(lower)) continue;
    if (value === null || value === undefined || value === '') continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      cleaned[key] = value;
    }
  }
  return cleaned;
}
