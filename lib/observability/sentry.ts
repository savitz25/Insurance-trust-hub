import * as Sentry from '@sentry/nextjs';
import {
  insuranceSentryOptions,
  providerTimeoutCapture,
  type ProviderQueryKind,
  type ProviderTimeoutTags,
} from '@/lib/observability/sentry-policy';

type Emitter = (error: Error, tags: ProviderTimeoutTags) => void;

let testEmitter: Emitter | null = null;
let initialized = false;

/** Tests replace the transport. Production calls Sentry.captureException. */
export function setProviderTimeoutEmitterForTests(emitter: Emitter | null): void {
  testEmitter = emitter;
}

/**
 * Initializes the server or edge SDK when SENTRY_DSN is set.
 * An unset DSN leaves the SDK uninitialized, which is a complete no-op.
 */
export function initInsuranceSentry(): void {
  if (initialized) return;
  const options = insuranceSentryOptions(process.env.SENTRY_DSN);
  if (!options) return;
  Sentry.init(options);
  initialized = true;
}

export function captureProviderStatementTimeout(
  error: unknown,
  ctx: { route: string; queryKind: ProviderQueryKind }
): void {
  const planned = providerTimeoutCapture(process.env.SENTRY_DSN, error, ctx);
  if (!planned) return;
  try {
    if (testEmitter) {
      testEmitter(planned.error, planned.tags);
      return;
    }
    Sentry.captureException(planned.error, { tags: planned.tags });
  } catch {
    // Reporting must not change the HTTP response.
  }
}
