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

const STATEMENT_TIMEOUT = /statement timeout/i;

/** SQLSTATE 57014 is Postgres `query_canceled` / statement timeout. */
export function readStatementSqlState(error: unknown): '57014' | null {
  if (!error || typeof error !== 'object') return null;
  const record = error as { code?: unknown; message?: unknown };
  if (record.code === '57014' || record.code === 57014) return '57014';
  if (
    typeof record.message === 'string' &&
    record.message.includes('57014') &&
    STATEMENT_TIMEOUT.test(record.message)
  ) {
    return '57014';
  }
  return null;
}

/**
 * A 500 from `/rest/v1/providers` whose body names SQLSTATE 57014.
 * The body itself is never returned.
 */
export function restStatementTimeoutError(status: number | null, body: string): { code: '57014' } | null {
  if (status !== 500) return null;
  if (/"code"\s*:\s*"57014"/.test(body) || (body.includes('57014') && STATEMENT_TIMEOUT.test(body))) {
    return { code: '57014' };
  }
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
 * SDK 11 reads `dataCollection` instead of `sendDefaultPii`.
 * `sendDefaultPii: false` stays set so the approved privacy flag is explicit.
 * Query text, cookies, headers, and user fields are not collected.
 */
export function insuranceSentryOptions(dsn: string | undefined): {
  dsn: string;
  tracesSampleRate: 0;
  sendDefaultPii: false;
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
  beforeSend: typeof scrubSentryEvent;
} | null {
  const trimmed = dsn?.trim();
  if (!trimmed) return null;
  return {
    dsn: trimmed,
    tracesSampleRate: 0,
    sendDefaultPii: false,
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
    beforeSend: scrubSentryEvent,
  };
}

function stripQuery(url: string): string {
  const queryIndex = url.indexOf('?');
  const hashIndex = url.indexOf('#');
  const cut = [queryIndex, hashIndex].filter((index) => index >= 0);
  if (!cut.length) return url;
  return url.slice(0, Math.min(...cut));
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
