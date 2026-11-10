export type AnalyticsEnvironment = 'production' | 'preview' | 'development';

let runtimeEnvironment: AnalyticsEnvironment | null = null;

export function normalizeAnalyticsEnvironment(value: string | null | undefined): AnalyticsEnvironment {
  const env = (value || '').trim().toLowerCase();
  if (env === 'production' || env === 'preview' || env === 'development') return env;
  return 'development';
}

/** Server layouts pass VERCEL_ENV into the client. Process env is the fallback for tests. */
export function setRuntimeAnalyticsEnvironment(value: string | null | undefined): void {
  runtimeEnvironment = normalizeAnalyticsEnvironment(value);
}

export function resetRuntimeAnalyticsEnvironmentForTests(): void {
  runtimeEnvironment = null;
}

export function analyticsEnvironment(): AnalyticsEnvironment {
  if (runtimeEnvironment) return runtimeEnvironment;
  return normalizeAnalyticsEnvironment(process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV);
}

export function posthogKey(): string {
  return (process.env.NEXT_PUBLIC_POSTHOG_KEY || '').trim();
}

export function posthogHost(): string {
  return (process.env.NEXT_PUBLIC_POSTHOG_HOST || '').trim() || 'https://us.i.posthog.com';
}

export function posthogDebugEnabled(): boolean {
  const flag = (process.env.NEXT_PUBLIC_POSTHOG_DEBUG || '').trim().toLowerCase();
  return flag === '1' || flag === 'true' || flag === 'yes';
}

/**
 * Missing key is a no-op. Development (and localhost) stay off unless the debug flag is set.
 * Preview and production send when the key is present.
 */
export function shouldEnablePosthog(): boolean {
  if (!posthogKey()) return false;
  const env = analyticsEnvironment();
  if (env === 'development' && !posthogDebugEnabled()) return false;
  if (typeof window !== 'undefined' && !posthogDebugEnabled()) {
    const host = window.location.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) return false;
    if (env !== 'preview' && navigator.webdriver) return false;
  }
  return true;
}
