/**
 * Structured Marketplace API errors — never include API keys in messages.
 */

export type MarketplaceErrorCode =
  | 'missing_api_key'
  | 'invalid_zip'
  | 'invalid_input'
  | 'county_not_found'
  | 'api_error'
  | 'empty_market'
  | 'upstream_timeout'
  | 'rate_limited';

export class MarketplaceError extends Error {
  readonly code: MarketplaceErrorCode;
  readonly httpStatus: number;
  readonly retryable: boolean;

  constructor(
    code: MarketplaceErrorCode,
    message: string,
    opts?: { httpStatus?: number; retryable?: boolean }
  ) {
    super(message);
    this.name = 'MarketplaceError';
    this.code = code;
    this.httpStatus = opts?.httpStatus ?? 0;
    this.retryable =
      opts?.retryable ??
      (code === 'upstream_timeout' || code === 'rate_limited' || code === 'api_error');
  }
}

/** Safe log line — strips anything that looks like an apikey query. */
export function sanitizeForLog(text: string): string {
  return text
    .replace(/apikey=[^&\s"']+/gi, 'apikey=[redacted]')
    .replace(/X-API-KEY[:\s]+[^\s"']+/gi, 'X-API-KEY:[redacted]')
    .slice(0, 500);
}

export function errorCodeFromHttp(status: number, bodySnippet: string): MarketplaceErrorCode {
  if (status === 429) return 'rate_limited';
  if (status === 0 && bodySnippet === 'timeout') return 'upstream_timeout';
  if (status === 0 && bodySnippet === 'missing_api_key') return 'missing_api_key';
  return 'api_error';
}
