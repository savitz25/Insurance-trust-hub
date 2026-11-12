/**
 * Server and edge only. There is no client SDK, session replay, or tracing sample.
 * SENTRY_DSN unset → initInsuranceSentry is a no-op.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
