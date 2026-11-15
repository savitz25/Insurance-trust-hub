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
  // OAuth and magic-link callbacks use a short `code` value. Length rules would keep it.
  if (lower === 'code') return true;
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
    if (url.searchParams.get('compression') === 'base64') url.searchParams.delete('compression');
    url.hash = '';
    url.username = '';
    url.password = '';
    const search = url.searchParams.toString();
    return hardenAnalyticsUrl(`${url.origin}${url.pathname}${search ? `?${search}` : ''}`);
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

/** Autocapture element fields that can echo user-entered text (labels, values, tooltips). */
const AUTOCAPTURE_TEXT_KEYS = [
  '$el_text',
  'text',
  'attr__aria-label',
  'attr__title',
  'attr__value',
  'attr__placeholder',
  'attr__alt',
] as const;

const ELEMENTS_CHAIN_TEXT_PATTERN = /(?<=[:"])(?:text|attr__aria-label|attr__title|attr__value|attr__placeholder|attr__alt)="(?:[^"\\]|\\.)*"/g;

/** Session replay / heatmap events. Replay is disabled for this hub; before_send drops these. */
export const REPLAY_EVENT_NAMES = ['$snapshot', '$snapshot_items', '$heatmap', '$$heatmap'] as const;

export function isReplayEvent(event: string | undefined | null): boolean {
  return typeof event === 'string' && (REPLAY_EVENT_NAMES as readonly string[]).includes(event);
}

export function stripElementsChainText(chain: string): string {
  return chain.replace(ELEMENTS_CHAIN_TEXT_PATTERN, '');
}

function stripAutocaptureText(properties: Record<string, unknown>): void {
  scrubPrivateElementAttributes(properties);
  delete properties.$el_text;
  if (typeof properties.$elements_chain === 'string') {
    properties.$elements_chain = stripElementsChainText(properties.$elements_chain);
  }
  if (Array.isArray(properties.$elements)) {
    for (const element of properties.$elements) {
      if (!element || typeof element !== 'object') continue;
      const record = element as Record<string, unknown>;
      for (const key of AUTOCAPTURE_TEXT_KEYS) delete record[key];
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
  stripAutocaptureText(properties);
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

const EXTRA_IDENTITY_KEYS = [
  'otp',
  'secret',
  'access_token',
  'refresh_token',
  'id_token',
  'session',
  'credential',
  'credentials',
] as const;

function nestedPropertyBag(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** Drops emails, search text, sign-in fields, and auth-shaped keys from one property bag. */
function scrubIdentityProperties(bag: Record<string, unknown>): void {
  sanitizeUrlProperties(bag);
  for (const key of Object.keys(bag)) {
    if (isPosthogReservedKey(key)) continue;
    if (isSensitiveAnalyticsPropertyKey(key)) {
      delete bag[key];
      continue;
    }
    const lower = key.toLowerCase();
    if ((FORBIDDEN_EVENT_KEYS as readonly string[]).includes(lower)) {
      delete bag[key];
      continue;
    }
    if ((EXTRA_IDENTITY_KEYS as readonly string[]).includes(lower)) {
      delete bag[key];
      continue;
    }
    if (/email|password|token|ssn|phone|secret|otp|authorization|cookie/.test(lower)) {
      delete bag[key];
      continue;
    }
    const value = bag[key];
    if (typeof value === 'string' && value.includes('@')) delete bag[key];
  }
  for (const key of ['distinct_id', 'email', '$email']) {
    const value = bag[key];
    if (typeof value === 'string' && value.includes('@')) delete bag[key];
  }
}

/**
 * Last pass for identify, capture, pageview, and custom events.
 * Clears a client-supplied network address and asks PostHog not to add a location.
 * PostHog can still see the request address. Storage of that address is a project setting.
 */
function finishPrivacyPayload(event: {
  properties?: Record<string, unknown>;
  $set?: Record<string, unknown>;
  $set_once?: Record<string, unknown>;
}): void {
  if (event.properties) {
    scrubIdentityProperties(event.properties);
    const set = nestedPropertyBag(event.properties.$set);
    const once = nestedPropertyBag(event.properties.$set_once);
    if (set) scrubIdentityProperties(set);
    if (once) scrubIdentityProperties(once);
    for (const key of Object.keys(event.properties)) {
      if (key === '$ip' || key.startsWith('$exception')) delete event.properties[key];
    }
    event.properties.$geoip_disable = true;
  }
  if (event.$set) scrubIdentityProperties(event.$set);
  if (event.$set_once) scrubIdentityProperties(event.$set_once);
}

/** `$exception` autocapture is never sent. Exception properties are removed from every event. */
export function suppressExceptionCapture<
  T extends { event?: string; properties?: Record<string, unknown> } | null,
>(event: T): T | null {
  if (!event) return event;
  if (event.properties) {
    for (const key of Object.keys(event.properties)) {
      if (key.startsWith('$exception')) delete event.properties[key];
    }
  }
  if (event.event === '$exception') return null;
  return event;
}

/** Added by the sanitizer. `$geoip_disable` asks PostHog to skip location enrichment for this event. */
export type SanitizedCaptureProperties = {
  $geoip_disable?: boolean;
};

export type SanitizedCaptureEvent<T> = T extends null
  ? null
  : T extends { properties?: infer P }
    ? Omit<T, 'properties'> & {
        properties: NonNullable<P> & SanitizedCaptureProperties;
      }
    : T;

export function sanitizeCaptureResult<
  T extends {
    properties?: Record<string, unknown>;
    $set?: Record<string, unknown>;
    $set_once?: Record<string, unknown>;
  } | null,
>(event: T): SanitizedCaptureEvent<T> {
  if (!event) return event as SanitizedCaptureEvent<T>;
  if (event.properties) sanitizePageviewProperties(event.properties);
  finishPrivacyPayload(event);
  return event as SanitizedCaptureEvent<T>;
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


const ANALYTICS_EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

function decodeAnalyticsPart(value: string): string | null {
  let current = value;
  try {
    for (let i = 0; i < 3; i++) {
      const next = decodeURIComponent(current.replace(/\+/g, ' '));
      if (next === current) return current;
      current = next;
    }
    return current;
  } catch {
    return null;
  }
}

/** Auth-shaped property names. stateCode, zipCode, countryCode, and areaCode stay. */
export function isSensitiveAnalyticsPropertyKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (lower === 'statecode' || lower === 'zipcode' || lower === 'countrycode' || lower === 'areacode') {
    return false;
  }
    if (lower === 'code' || lower === 'authcode' || /(^|_)code$/.test(lower)) return true;
  if (lower === 'q' || lower === 'query' || lower === 'question' || lower === 'search' || lower === 'searchterm') return true;
  return /email|password|token|ssn|phone|secret|otp|authorization|cookie|credential|^notes?$/.test(lower);
}

function queryValueIsUnsafe(value: string): boolean {
  const decoded = decodeAnalyticsPart(value);
  if (decoded == null) return true;
  if (ANALYTICS_EMAIL.test(decoded) || /PRIVATE_/i.test(decoded)) return true;
  return /[?&#](?:authcode|auth_code|code|otp|password|access_token|refresh_token|email|q|query|question|search|searchterm)=/i.test(decoded);
}

/** Second pass: email-shaped values, nested secrets, path emails, and undecodable text fail closed. */
export function hardenAnalyticsUrl(sanitized: string | undefined): string | undefined {
  if (!sanitized) return undefined;
  let url: URL;
  try {
    url = new URL(sanitized);
  } catch {
    return undefined;
  }
  const kept: string[] = [];
  for (const segment of url.pathname.split('/')) {
    if (segment === '') {
      kept.push('');
      continue;
    }
    const decoded = decodeAnalyticsPart(segment);
    if (decoded == null || ANALYTICS_EMAIL.test(decoded) || /PRIVATE_/i.test(decoded)) continue;
    kept.push(segment);
  }
  const path = kept.join('/') || '/';
  url.pathname = path.startsWith('/') ? path : `/${path}`;
  for (const key of [...url.searchParams.keys()]) {
    const decodedKey = decodeAnalyticsPart(key);
    const values = url.searchParams.getAll(key);
    if (
      decodedKey == null ||
      isSensitiveAnalyticsPropertyKey(decodedKey) ||
      values.some((value) => queryValueIsUnsafe(value))
    ) {
      url.searchParams.delete(key);
    }
  }
  url.hash = '';
  url.username = '';
  url.password = '';
  const href = `${url.origin}${url.pathname}${url.search}`;
  const decodedHref = decodeAnalyticsPart(href);
  if (
    decodedHref == null ||
    ANALYTICS_EMAIL.test(decodedHref) ||
    /PRIVATE_/i.test(decodedHref) ||
    /[?&](?:code|auth_code)=/i.test(decodedHref)
  ) {
    return `${url.origin}${url.pathname}`;
  }
  return href;
}

function attributeValueIsPrivate(value: string): boolean {
  return /private_|@/i.test(value) || ANALYTICS_EMAIL.test(value);
}

function scrubPrivateElementAttributes(properties: Record<string, unknown>): void {
  if (typeof properties.$elements_chain === 'string') {
    properties.$elements_chain = properties.$elements_chain.replace(
      /attr__?[A-Za-z0-9_-]*="(?:[^"\\]|\\.)*"/g,
      (match) => {
        const parsed = /^attr__?([A-Za-z0-9_-]*)="((?:[^"\\]|\\.)*)"$/.exec(match);
        if (!parsed) return '';
        const name = parsed[1];
        const attrValue = parsed[2];
        if (name == null || attrValue == null) return '';
        const lower = name.toLowerCase();
        if (lower.startsWith('data-') || lower === 'note' || lower === 'notes' || attributeValueIsPrivate(attrValue)) {
          return '';
        }
        return match;
      },
    );
  }
  if (!Array.isArray(properties.$elements)) return;
  for (const element of properties.$elements) {
    if (!element || typeof element !== 'object') continue;
    const record = element as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      if (!key.startsWith('attr')) continue;
      const name = key.replace(/^attr__?/, '').toLowerCase();
      const value = record[key];
      if (name.startsWith('data-') || name === 'note' || name === 'notes') {
        delete record[key];
        continue;
      }
      if (typeof value === 'string' && attributeValueIsPrivate(value)) delete record[key];
    }
  }
}

function isProtocolField(key: string): boolean {
  return key === 'token' || key === 'api_key' || key === 'distinct_id' || key === '$device_id';
}

function isPersonBag(key: string): boolean {
  return (
    key === 'person_properties' ||
    key === '$set' ||
    key === '$set_once' ||
    key === '$groups' ||
    key === 'user_properties' ||
    key === '$user_properties'
  );
}

/** Protocol ids stay on the request envelope. Nested search, auth, and token fields do not. */
function sanitizeOutboundValue(
  value: unknown,
  where: 'root' | 'event' | 'props' | 'person' | 'other' = 'root',
): unknown {
  if (Array.isArray(value)) {
    const itemWhere = where === 'root' ? 'event' : 'other';
    return value.map((item) => sanitizeOutboundValue(item, itemWhere));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [childKey, child] of Object.entries(value as Record<string, unknown>)) {
      const envelope = where === 'root' || where === 'event';
      if (isProtocolField(childKey)) {
        if (envelope) out[childKey] = child;
        continue;
      }
      if ((where === 'person' || !childKey.startsWith('$')) && isSensitiveAnalyticsPropertyKey(childKey)) continue;
      let nextWhere: 'root' | 'event' | 'props' | 'person' | 'other' = where === 'person' ? 'person' : 'other';
      if (childKey === 'batch' || childKey === 'events') nextWhere = 'root';
      else if (childKey === 'properties') nextWhere = 'props';
      else if (isPersonBag(childKey)) nextWhere = 'person';
      const next = sanitizeOutboundValue(child, nextWhere);
      if (next !== undefined) out[childKey] = next;
    }
    return out;
  }
  if (typeof value === 'string') {
    if (value.includes('://') || value.includes('?') || value.startsWith('/')) {
      return hardenAnalyticsUrl(sanitizeAnalyticsUrl(value)) || '';
    }
    if (ANALYTICS_EMAIL.test(value) || /PRIVATE_/i.test(value)) return '';
  }
  return value;
}

export function sanitizeAnalyticsRequestBody(body: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  let encoded: string;
  try {
    encoded = JSON.stringify(sanitizeOutboundValue(parsed));
  } catch {
    return null;
  }
  let decoded = encoded;
  try {
    decoded = decodeURIComponent(encoded);
  } catch {
    return null;
  }
  if (/PRIVATE_|qa@example|qa%40example|[?&](?:authcode|auth_code|code)=/i.test(decoded)) return null;
  return encoded;
}

function analyticsEndpoint(pathname: string): boolean {
  return /\/(?:flags|decide|e|capture|batch|engage|s|config)(?:\/|$)|\/i\/v|\/array\//i.test(pathname);
}

function configuredAnalyticsHost(): string | null {
  try {
    const raw = process.env.NEXT_PUBLIC_POSTHOG_HOST;
    if (typeof raw !== 'string' || raw.length === 0) return null;
    return new URL(raw).host;
  } catch {
    return null;
  }
}

function isVerifiedPosthogDestination(raw: string): boolean {
  if (!raw) return false;
  try {
    const base = typeof window !== 'undefined' ? window.location.href : 'https://collector.invalid';
    const url = new URL(raw, base);
    const host = configuredAnalyticsHost();
    if (!host || url.host !== host) return false;
    return analyticsEndpoint(url.pathname);
  } catch {
    return false;
  }
}

function sanitizeDestinationUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    for (const key of [...url.searchParams.keys()]) {
      const decodedKey = decodeAnalyticsPart(key);
      const values = url.searchParams.getAll(key);
      if (
        decodedKey == null ||
        isSensitiveAnalyticsPropertyKey(decodedKey) ||
        values.some((value) => queryValueIsUnsafe(value))
      ) {
        url.searchParams.delete(key);
      }
    }
    url.hash = '';
    url.username = '';
    url.password = '';
    if (url.searchParams.get('compression') === 'base64') url.searchParams.delete('compression');
    return url.toString();
  } catch {
    return null;
  }
}

function emptyAnalyticsResponse(): Response {
  return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
}

function finishBlockedRequest(xhr: XMLHttpRequest): void {
  queueMicrotask(() => {
    try {
      Object.defineProperty(xhr, 'readyState', { configurable: true, get: () => 4 });
      Object.defineProperty(xhr, 'status', { configurable: true, get: () => 200 });
      Object.defineProperty(xhr, 'responseText', { configurable: true, get: () => '{}' });
      Object.defineProperty(xhr, 'response', { configurable: true, get: () => '{}' });
      xhr.dispatchEvent(new Event('readystatechange'));
      xhr.dispatchEvent(new Event('load'));
      xhr.dispatchEvent(new Event('loadend'));
    } catch {
      /* The SDK already stopped this request. */
    }
  });
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  let length = 0;
  for (const chunk of chunks) length += chunk.byteLength;
  const out = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

function isGzipBytes(bytes: Uint8Array): boolean {
  const first = bytes[0];
  const second = bytes[1];
  return bytes.byteLength >= 2 && first === 0x1f && second === 0x8b;
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

async function gzipCodec(name: 'CompressionStream' | 'DecompressionStream', bytes: Uint8Array): Promise<Uint8Array | null> {
  const ctor = (globalThis as unknown as Record<string, unknown>)[name];
  if (typeof ctor !== 'function') return null;
  try {
    const codec = new (ctor as new (format: string) => TransformStream<Uint8Array, Uint8Array>)('gzip');
    return new Uint8Array(await new Response(new Blob([bytesToArrayBuffer(bytes)]).stream().pipeThrough(codec)).arrayBuffer());
  } catch {
    return null;
  }
}

function decodeBase64Form(text: string): string | null {
  if (!text.startsWith('data=')) return null;
  try {
    const binary = atob(decodeURIComponent(text.slice(5)));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

async function plaintextFromBytes(bytes: Uint8Array): Promise<{ text: string; kind: 'json' | 'form' | 'gzip' } | null> {
  let raw = bytes;
  let kind: 'json' | 'form' | 'gzip' = 'json';
  if (isGzipBytes(bytes)) {
    const inflated = await gzipCodec('DecompressionStream', bytes);
    if (!inflated) return null;
    raw = inflated;
    kind = 'gzip';
  }
  let text = '';
  try {
    text = new TextDecoder().decode(raw);
  } catch {
    return null;
  }
  if (text.startsWith('data=')) {
    const decoded = decodeBase64Form(text);
    if (decoded == null) return null;
    return { text: decoded, kind: 'form' };
  }
  return { text, kind };
}

async function encodePlaintext(
  text: string,
  kind: 'json' | 'form' | 'gzip',
): Promise<{ body: BodyInit; contentType: string; gzip: boolean } | null> {
  if (kind === 'form') return { body: text, contentType: 'application/json', gzip: false };
  if (kind === 'gzip') {
    const packed = await gzipCodec('CompressionStream', new TextEncoder().encode(text));
    if (packed) return { body: bytesToArrayBuffer(packed), contentType: 'text/plain', gzip: true };
  }
  return { body: text, contentType: 'application/json', gzip: false };
}

function bytesFromParts(parts: BlobPart[], blobParts: WeakMap<Blob, BlobPart[]>): Uint8Array | null {
  const chunks: Uint8Array[] = [];
  for (const part of parts) {
    if (typeof part === 'string') {
      chunks.push(new TextEncoder().encode(part));
      continue;
    }
    if (part instanceof ArrayBuffer) {
      chunks.push(new Uint8Array(part));
      continue;
    }
    if (ArrayBuffer.isView(part)) {
      chunks.push(new Uint8Array(part.buffer, part.byteOffset, part.byteLength));
      continue;
    }
    if (part instanceof Blob) {
      const nested = blobParts.get(part);
      if (!nested) return null;
      const inner = bytesFromParts(nested, blobParts);
      if (!inner) return null;
      chunks.push(inner);
      continue;
    }
    return null;
  }
  return concatBytes(chunks);
}

async function readBodyBytes(input: RequestInfo | URL, init: RequestInit | undefined): Promise<Uint8Array | null | 'unsupported'> {
  const direct = init && 'body' in init ? init.body : undefined;
  if (direct == null) {
    if (typeof Request !== 'undefined' && input instanceof Request) {
      const buf = await input.clone().arrayBuffer();
      if (buf.byteLength === 0) return null;
      return new Uint8Array(buf);
    }
    return null;
  }
  if (typeof direct === 'string') return new TextEncoder().encode(direct);
  if (typeof URLSearchParams !== 'undefined' && direct instanceof URLSearchParams) {
    return new TextEncoder().encode(direct.toString());
  }
  if (typeof Blob !== 'undefined' && direct instanceof Blob) return new Uint8Array(await direct.arrayBuffer());
  if (direct instanceof ArrayBuffer) return new Uint8Array(direct);
  if (ArrayBuffer.isView(direct)) return new Uint8Array(direct.buffer, direct.byteOffset, direct.byteLength);
  return 'unsupported';
}

let analyticsTransportGuarded = false;

/** Sanitize verified PostHog destinations. Other origins, including lookalike paths, pass through. */
export function installAnalyticsTransportGuard(): void {
  if (analyticsTransportGuarded || typeof window === 'undefined') return;
  analyticsTransportGuarded = true;
  const originalFetch = window.fetch.bind(window);
  const nativeBlob = window.Blob;
  const blobParts = new WeakMap<Blob, BlobPart[]>();
  const RecordingBlob = function RecordingBlob(parts?: BlobPart[], options?: BlobPropertyBag): Blob {
    const blob = new nativeBlob(parts || [], options);
    if (parts && parts.length > 0) blobParts.set(blob, parts.slice());
    return blob;
  } as unknown as typeof Blob;
  RecordingBlob.prototype = nativeBlob.prototype;
  window.Blob = RecordingBlob;

  const requestUrl = (input: RequestInfo | URL): string => {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.href;
    return input.url;
  };

  const forwardFetch = (
    input: RequestInfo | URL,
    init: RequestInit | undefined,
    safeUrl: string,
    encoded: { body: BodyInit; contentType: string; gzip: boolean } | null,
  ): Promise<Response> => {
    const request = typeof Request !== 'undefined' && input instanceof Request ? input : null;
    const headers = new Headers(init?.headers || request?.headers);
    const method = init?.method || request?.method || 'GET';
    if (encoded) {
      headers.set('content-type', encoded.contentType);
      if (encoded.gzip) headers.set('content-encoding', 'gzip');
      else headers.delete('content-encoding');
    }
    headers.delete('content-length');
    const nextInit: RequestInit = {
      method,
      headers,
      credentials: init?.credentials || request?.credentials,
      keepalive: init?.keepalive ?? request?.keepalive,
      cache: init?.cache || request?.cache,
      redirect: init?.redirect || request?.redirect,
      referrer: init?.referrer || request?.referrer,
      integrity: init?.integrity || request?.integrity,
      mode: init?.mode || request?.mode,
    };
    if (encoded && method !== 'GET' && method !== 'HEAD') nextInit.body = encoded.body;
    return originalFetch(safeUrl, nextInit);
  };

  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const target = requestUrl(input);
    if (!isVerifiedPosthogDestination(target)) return originalFetch(input, init);
    const safeUrl = sanitizeDestinationUrl(target);
    if (!safeUrl) return Promise.resolve(emptyAnalyticsResponse());
    return (async () => {
      const bytes = await readBodyBytes(input, init);
      if (bytes === 'unsupported') return emptyAnalyticsResponse();
      if (bytes == null) return forwardFetch(input, init, safeUrl, null);
      const decoded = await plaintextFromBytes(bytes);
      if (!decoded) return emptyAnalyticsResponse();
      const next = sanitizeAnalyticsRequestBody(decoded.text);
      if (next == null) return emptyAnalyticsResponse();
      const encoded = await encodePlaintext(next, decoded.kind);
      if (!encoded) return emptyAnalyticsResponse();
      return forwardFetch(input, init, safeUrl, encoded);
    })().catch(() => emptyAnalyticsResponse());
  };

  const xhrProto = XMLHttpRequest.prototype;
  const originalOpen = xhrProto.open;
  const originalSend = xhrProto.send;
  xhrProto.open = function open(
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null,
  ): void {
    const raw = String(url ?? '');
    const record = this as XMLHttpRequest & { __trusthubUrl?: string; __trusthubBlock?: boolean };
    record.__trusthubBlock = false;
    record.__trusthubUrl = raw;
    if (isVerifiedPosthogDestination(raw)) {
      const safe = sanitizeDestinationUrl(raw);
      if (!safe) record.__trusthubBlock = true;
      else record.__trusthubUrl = safe;
    }
    originalOpen.call(this, method, record.__trusthubUrl || raw, async ?? true, username ?? null, password ?? null);
  } as typeof xhrProto.open;
  xhrProto.send = function send(this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null): void {
    const record = this as XMLHttpRequest & { __trusthubUrl?: string; __trusthubBlock?: boolean };
    const url = record.__trusthubUrl || '';
    if (record.__trusthubBlock) {
      finishBlockedRequest(this);
      return;
    }
    if (!isVerifiedPosthogDestination(url)) {
      originalSend.call(this, body ?? null);
      return;
    }
    const safeUrl = sanitizeDestinationUrl(url);
    if (!safeUrl) {
      finishBlockedRequest(this);
      return;
    }
    if (typeof body === 'string') {
      const next = sanitizeAnalyticsRequestBody(body);
      if (next == null) {
        finishBlockedRequest(this);
        return;
      }
      originalSend.call(this, next);
      return;
    }
    const bytes =
      body instanceof ArrayBuffer
        ? new Uint8Array(body)
        : ArrayBuffer.isView(body)
          ? new Uint8Array(body.buffer, body.byteOffset, body.byteLength)
          : body instanceof Blob
            ? bytesFromParts(blobParts.get(body) || [], blobParts)
            : null;
    finishBlockedRequest(this);
    if (!bytes) return;
    void (async () => {
      const decoded = await plaintextFromBytes(bytes);
      if (!decoded) return;
      const next = sanitizeAnalyticsRequestBody(decoded.text);
      if (next == null) return;
      const encoded = await encodePlaintext(next, decoded.kind);
      if (!encoded) return;
      await originalFetch(safeUrl, {
        method: 'POST',
        body: encoded.body,
        headers: { 'content-type': encoded.contentType },
        keepalive: true,
      });
    })();
  } as typeof xhrProto.send;

  if (typeof navigator.sendBeacon === 'function') {
    const originalBeacon = navigator.sendBeacon.bind(navigator);
    const deliver = async (safeUrl: string, bytes: Uint8Array): Promise<void> => {
      const decoded = await plaintextFromBytes(bytes);
      if (!decoded) return;
      const next = sanitizeAnalyticsRequestBody(decoded.text);
      if (next == null) return;
      const encoded = await encodePlaintext(next, decoded.kind);
      if (!encoded) return;
      const payload =
        typeof encoded.body === 'string' ? encoded.body : new nativeBlob([encoded.body as BlobPart], { type: encoded.contentType });
      if (!originalBeacon(safeUrl, payload)) {
        await originalFetch(safeUrl, {
          method: 'POST',
          body: encoded.body,
          headers: { 'content-type': encoded.contentType },
          keepalive: true,
        });
      }
    };
    navigator.sendBeacon = (url: string | URL, data?: BodyInit | null): boolean => {
      const target = String(url);
      if (!isVerifiedPosthogDestination(target)) return originalBeacon(url, data);
      const safeUrl = sanitizeDestinationUrl(target);
      if (!safeUrl) return true;
      if (data == null) return originalBeacon(safeUrl);
      if (typeof data === 'string') {
        void deliver(safeUrl, new TextEncoder().encode(data));
        return true;
      }
      if (data instanceof URLSearchParams) {
        void deliver(safeUrl, new TextEncoder().encode(data.toString()));
        return true;
      }
      if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
        const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        void deliver(safeUrl, bytes);
        return true;
      }
      if (data instanceof Blob) {
        const recorded = blobParts.get(data);
        const bytes = recorded ? bytesFromParts(recorded, blobParts) : null;
        if (bytes) {
          void deliver(safeUrl, bytes);
          return true;
        }
        void data.arrayBuffer().then((buf) => deliver(safeUrl, new Uint8Array(buf)));
        return true;
      }
      return true;
    };
  }
}
