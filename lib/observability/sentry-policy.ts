/**
 * Server/edge Sentry policy for Insurance Trust Hub.
 * No DSN means the SDK is not initialized and statement-timeout capture does not emit.
 * Events carry only the tags below — never the Postgres message, query text, or request.
 */

export const PROVIDERS_STATEMENT_ROUTE = '/rest/v1/providers';

export type ProviderQueryKind = 'count' | 'page';

export type ProviderTimeoutContext = {
  route: string;
  queryKind: ProviderQueryKind;
};

export type ProviderTimeoutTags = {
  hub: 'insurance';
  route: string;
  sqlstate: '57014';
  query_kind: ProviderQueryKind;
};

export type ProviderTimeoutCapture = {
  error: Error;
  tags: ProviderTimeoutTags;
};

type ScrubbableRequest = {
  headers?: unknown;
  cookies?: unknown;
  query_string?: unknown;
  url?: string;
  data?: unknown;
};

type ScrubbableEvent = {
  request?: ScrubbableRequest;
  user?: unknown;
  breadcrumbs?: Array<{ data?: Record<string, unknown> | null } | null>;
};

/** A Postgres SQLSTATE is exactly five digits or uppercase letters (e.g. 57014, 23505, 42P01). */
const SQLSTATE = /^[0-9A-Z]{5}$/;

function sqlStateOf(value: unknown): string | null {
  if (typeof value === 'string') return SQLSTATE.test(value) ? value : null;
  if (typeof value === 'number' && Number.isInteger(value) && value >= 10000 && value <= 99999) {
    return String(value);
  }
  return null;
}

/**
 * The first structured SQLSTATE on the error, its `cause`, or a wrapped `error`, outermost first.
 * Only `code` fields count. Message, details, and hint text are never read, so
 * "statement timeout" or digits such as 1570149 in a message cannot produce a SQLSTATE.
 */
export function structuredSqlState(error: unknown): string | null {
  const seen = new Set<object>();
  let level: unknown[] = [error];
  for (let depth = 0; depth < 5 && level.length; depth += 1) {
    const next: unknown[] = [];
    for (const node of level) {
      if (!node || typeof node !== 'object' || seen.has(node)) continue;
      seen.add(node);
      const record = node as { code?: unknown; cause?: unknown; error?: unknown };
      const state = sqlStateOf(record.code);
      if (state) return state;
      next.push(record.cause, record.error);
    }
    level = next;
  }
  return null;
}

/**
 * SQLSTATE 57014 is Postgres `query_canceled` / statement timeout.
 * Requires a structured `code` of exactly 57014. An explicit other SQLSTATE (e.g. 23505) is never
 * overridden by message text.
 */
export function readStatementSqlState(error: unknown): '57014' | null {
  return structuredSqlState(error) === '57014' ? '57014' : null;
}

/**
 * PostgREST sends `Proxy-Status: PostgREST; error=57014` on a failed HEAD.
 * The header is the SQLSTATE. A bare HTTP 500 is not treated as a statement timeout.
 */
export function proxyStatusSqlState(proxyStatus: string | null | undefined): '57014' | null {
  if (!proxyStatus) return null;
  return /(?:^|[;\s])error=57014(?:$|[;\s])/.test(proxyStatus) ? '57014' : null;
}

/**
 * Exact-count queries use HTTP HEAD, which has no JSON body.
 * Report 57014 only when the error's structured code or, absent any structured SQLSTATE,
 * Proxy-Status actually says so. An explicit non-57014 SQLSTATE wins over Proxy-Status.
 */
export function headCountTimeoutError(error: unknown, proxyStatus: string | null | undefined): unknown {
  const state = structuredSqlState(error);
  if (state === '57014') return { code: '57014' };
  if (state === null && proxyStatusSqlState(proxyStatus) === '57014') return { code: '57014' };
  return error;
}

/** The top-level `code` of a PostgREST JSON error body, or null. */
function bodySqlState(body: string): string | null {
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return sqlStateOf((parsed as { code?: unknown }).code);
    }
    return null;
  } catch {
    // A truncated body: only a leading `{"code":"XXXXX"` counts, never digits elsewhere.
    const match = /^\s*\{\s*"code"\s*:\s*"([^"]*)"/.exec(body);
    return match ? sqlStateOf(match[1]) : null;
  }
}

/**
 * A 500 from `/rest/v1/providers` whose body `code` is SQLSTATE 57014, or whose body carries no
 * SQLSTATE and whose Proxy-Status says `error=57014`. A generic or empty 500 is not a timeout,
 * and an explicit other SQLSTATE in the body is never overridden. The body itself is never returned.
 */
export function restStatementTimeoutError(
  status: number | null,
  body: string,
  proxyStatus?: string | null
): { code: '57014' } | null {
  if (status !== 500) return null;
  const state = bodySqlState(body);
  if (state === '57014') return { code: '57014' };
  if (state === null && proxyStatusSqlState(proxyStatus) === '57014') return { code: '57014' };
  return null;
}

/** Null when SENTRY_DSN is unset or the error is not a statement timeout. */
export function providerTimeoutCapture(
  dsn: string | undefined,
  error: unknown,
  ctx: ProviderTimeoutContext
): ProviderTimeoutCapture | null {
  if (!dsn?.trim()) return null;
  if (readStatementSqlState(error) !== '57014') return null;
  const route = ctx.route.split('?')[0]?.split('#')[0] ?? PROVIDERS_STATEMENT_ROUTE;
  return {
    error: new Error('Postgres statement timeout'),
    tags: {
      hub: 'insurance',
      route,
      sqlstate: '57014',
      query_kind: ctx.queryKind,
    },
  };
}

/**
 * Default SDK integrations kept for this instrumentation. Everything else is removed, including
 * Console (console breadcrumbs), Http / NodeFetch / WinterCGFetch (outgoing-call breadcrumbs with
 * URLs), RequestData (incoming request), the global uncaught-exception / unhandled-rejection
 * handlers (arbitrary error text), LocalVariables, ContextLines, Modules, ChildProcess, and others.
 * The only events this hub sends are explicit provider statement-timeout captures.
 */
export const INSURANCE_SENTRY_INTEGRATIONS = ['EventFilters', 'FunctionToString', 'LinkedErrors', 'Dedupe'] as const;

type NamedIntegration = { name: string };

export function insuranceSentryIntegrations<I extends NamedIntegration>(defaults: I[]): I[] {
  const allowed: readonly string[] = INSURANCE_SENTRY_INTEGRATIONS;
  return defaults.filter((integration) => allowed.includes(integration.name));
}

/** Breadcrumbs are never collected: console, fetch, http, and manual crumbs are all dropped. */
export function dropSentryBreadcrumb(): null {
  return null;
}

/**
 * SDK 11 reads `dataCollection` instead of `sendDefaultPii`.
 * `sendDefaultPii: false` stays set so the approved privacy flag is explicit.
 * Query text, cookies, headers, user fields, and breadcrumbs are not collected, and
 * `beforeSend` rebuilds every outgoing event from an allowlist.
 */
export function insuranceSentryOptions(dsn: string | undefined): {
  dsn: string;
  tracesSampleRate: 0;
  sendDefaultPii: false;
  maxBreadcrumbs: 0;
  dataCollection: {
    userInfo: false;
    cookies: false;
    httpHeaders: false;
    urlQueryParams: false;
    httpBodies: [];
    databaseQueryData: false;
    stackFrameVariables: false;
    queues: false;
    graphQL: { document: false; variables: false };
    genAI: { inputs: false; outputs: false };
    mcp: { inputs: false; outputs: false };
  };
  integrations: typeof insuranceSentryIntegrations;
  beforeBreadcrumb: typeof dropSentryBreadcrumb;
  beforeSend: typeof insuranceBeforeSend;
} | null {
  const trimmed = dsn?.trim();
  if (!trimmed) return null;
  return {
    dsn: trimmed,
    tracesSampleRate: 0,
    sendDefaultPii: false,
    maxBreadcrumbs: 0,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      urlQueryParams: false,
      httpBodies: [],
      databaseQueryData: false,
      stackFrameVariables: false,
      queues: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      mcp: { inputs: false, outputs: false },
    },
    integrations: insuranceSentryIntegrations,
    beforeBreadcrumb: dropSentryBreadcrumb,
    beforeSend: insuranceBeforeSend,
  };
}

function stripQuery(url: string): string {
  const queryIndex = url.indexOf('?');
  const hashIndex = url.indexOf('#');
  const cut = [queryIndex, hashIndex].filter((index) => index >= 0);
  if (!cut.length) return url;
  return url.slice(0, Math.min(...cut));
}

const REDACTIONS: Array<[RegExp, string]> = [
  [/\b(Bearer|Basic|Token|Digest)\s+[^\s"',;]+/gi, '$1 [redacted]'],
  [/\beyJ[\w-]*\.[\w-]+\.[\w-]*/g, '[redacted-jwt]'],
  [/[\w.+-]+(?:@|%40)[\w-]+(?:\.[\w-]+)+/gi, '[redacted-email]'],
  [
    /\b(authorization|api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|token|secret|password|passwd|pwd|cookie|session|signature|sig|q|query|email)=([^\s&;,"']*)/gi,
    '$1=[redacted]',
  ],
  [/\?[^\s"'#]*/g, ''],
];

/** Removes emails, credentials, JWTs, and query strings from free text. */
export function redactSentryText(text: string): string {
  let out = text;
  for (const [pattern, replacement] of REDACTIONS) out = out.replace(pattern, replacement);
  return out;
}

function redactDeep(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return redactSentryText(value);
  if (!value || typeof value !== 'object' || depth > 8) return value;
  if (Array.isArray(value)) return value.map((item) => redactDeep(item, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) out[key] = redactDeep(item, depth + 1);
  return out;
}

function scrubData(data: Record<string, unknown>): void {
  delete data.headers;
  delete data.cookies;
  delete data.query_string;
  delete data.query;
  if (typeof data.url === 'string') data.url = stripQuery(data.url);
  if (typeof data.request_url === 'string') data.request_url = stripQuery(data.request_url);
}

/** Drops headers, cookies, and query strings before an event can leave the process. */
export function scrubSentryEvent<E extends ScrubbableEvent>(event: E): E {
  if (event.request) {
    event.request.headers = {};
    event.request.cookies = {};
    event.request.query_string = '';
    delete event.request.data;
    if (typeof event.request.url === 'string') {
      event.request.url = stripQuery(event.request.url);
    }
  }
  delete event.user;
  if (event.breadcrumbs) {
    for (const crumb of event.breadcrumbs) {
      if (crumb?.data) scrubData(crumb.data);
    }
  }
  return event;
}

const PROVIDER_TIMEOUT_TAGS = ['hub', 'route', 'sqlstate', 'query_kind'] as const;
const KEPT_CONTEXTS = ['runtime', 'trace'] as const;

type OutgoingEvent = ScrubbableEvent & {
  tags?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
  extra?: unknown;
  modules?: unknown;
  server_name?: unknown;
  transaction?: unknown;
  message?: unknown;
  logentry?: unknown;
  exception?: { values?: unknown[] };
};

/** True only for events built by `providerTimeoutCapture`. */
function isProviderTimeoutEvent(event: OutgoingEvent): boolean {
  return event.tags?.hub === 'insurance' && event.tags?.sqlstate === '57014';
}

/**
 * `beforeSend` for the real SDK. Any event that is not an explicit provider statement-timeout
 * capture is dropped. A timeout event keeps only its four tags, the runtime/trace contexts, and
 * the exception (without source lines or frame variables); every remaining string is redacted.
 * Request, user, breadcrumbs, extra, modules, server name, transaction, and other contexts are removed.
 */
export function insuranceBeforeSend<E extends OutgoingEvent>(event: E): E | null {
  if (!isProviderTimeoutEvent(event)) return null;
  scrubSentryEvent(event);
  delete event.request;
  delete event.breadcrumbs;
  delete event.extra;
  delete event.modules;
  delete event.server_name;
  delete event.transaction;
  delete event.message;
  delete event.logentry;

  const tags: Record<string, unknown> = {};
  for (const key of PROVIDER_TIMEOUT_TAGS) {
    const value = event.tags?.[key];
    if (typeof value === 'string') tags[key] = key === 'route' ? stripQuery(value) : value;
  }
  event.tags = tags;

  if (event.contexts) {
    const contexts: Record<string, unknown> = {};
    for (const key of KEPT_CONTEXTS) {
      if (event.contexts[key] !== undefined) contexts[key] = event.contexts[key];
    }
    event.contexts = contexts;
  }

  for (const value of event.exception?.values ?? []) {
    const frames = (value as { stacktrace?: { frames?: Array<Record<string, unknown>> } }).stacktrace?.frames;
    for (const frame of frames ?? []) {
      delete frame.vars;
      delete frame.pre_context;
      delete frame.context_line;
      delete frame.post_context;
    }
    const mechanism = (value as { mechanism?: Record<string, unknown> }).mechanism;
    if (mechanism) delete mechanism.data;
  }

  for (const key of ['tags', 'contexts', 'exception'] as const) {
    if (event[key] !== undefined) (event as Record<string, unknown>)[key] = redactDeep(event[key]);
  }
  return event;
}
