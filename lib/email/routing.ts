/**
 * Insurance Trust Hub — mail routing map (documented, explicit).
 *
 * INBOUND:  ImprovMX forwards *@insurancetrusthub.com → operator inbox
 *           (see docs/IMPROVMX-SETUP.md). Resend does NOT receive inbound.
 * OUTBOUND: Resend sends *from* verified brand addresses.
 *
 * Monitored operator inbox (Google Workspace on movetrusthub.com):
 *   info@movetrusthub.com
 */

/** Public brand address published on site (footer, contact, privacy, terms). */
export const PUBLIC_CONTACT_EMAIL = 'hello@insurancetrusthub.com' as const;

/**
 * Monitored human inbox for Insurance operations.
 * Forms/admin: Resend TO here. Inbound hello@: ImprovMX forward here.
 */
export const DEFAULT_OPERATOR_INBOX = 'info@movetrusthub.com' as const;

/** Resend "from" identity — must be on a domain verified in Resend. */
export const DEFAULT_TRANSACTIONAL_FROM =
  'Insurance Trust Hub <hello@insurancetrusthub.com>' as const;

/**
 * Intended routing — keep in sync with docs/EMAIL-ROUTING.md + IMPROVMX-SETUP.md.
 *
 *   hello@insurancetrusthub.com     → info@movetrusthub.com
 *   contact@insurancetrusthub.com   → info@movetrusthub.com
 *   *@insurancetrusthub.com         → info@movetrusthub.com
 */
export const INSURANCE_MAIL_ROUTING = [
  {
    address: 'hello@insurancetrusthub.com',
    purpose: 'Public contact (footer, contact page, legal, email footers)',
    intendedDestination: DEFAULT_OPERATOR_INBOX,
    transport: 'improvmx_forward' as const,
    notes: 'Published SITE_EMAIL. ImprovMX alias + catch-all → operator. Needs Vercel MX.',
  },
  {
    address: 'contact@insurancetrusthub.com',
    purpose: 'Alias (not required on public UI; catch-all covers it)',
    intendedDestination: DEFAULT_OPERATOR_INBOX,
    transport: 'improvmx_forward' as const,
    notes: 'Explicit ImprovMX alias optional when catch-all is enabled.',
  },
  {
    address: `*@insurancetrusthub.com`,
    purpose: 'ImprovMX catch-all',
    intendedDestination: DEFAULT_OPERATOR_INBOX,
    transport: 'improvmx_forward' as const,
    notes: 'Catch-all → operator; do not publish random addresses as marketing contacts.',
  },
  {
    address: DEFAULT_OPERATOR_INBOX,
    purpose: 'Monitored operator inbox (Google Workspace)',
    intendedDestination: DEFAULT_OPERATOR_INBOX,
    transport: 'native_mailbox' as const,
    notes: 'MX for movetrusthub.com → smtp.google.com. Form notifications TO this address.',
  },
] as const;

/**
 * Where Resend should deliver form / lead notifications (TO).
 * Prefer OPERATOR_INBOX, then LEAD_NOTIFICATION_EMAIL, then default monitored inbox.
 * Never default TO hello@ unless inbound MX+forward is known live — undeliverable without MX.
 */
export function operatorNotificationInbox(): string {
  const fromEnv =
    process.env.OPERATOR_INBOX?.trim() ||
    process.env.LEAD_NOTIFICATION_EMAIL?.trim() ||
    process.env.EMAIL_FORWARD_TO?.trim();
  if (fromEnv) return fromEnv;
  return DEFAULT_OPERATOR_INBOX;
}

/**
 * Resend From header for Insurance transactional + form mail.
 * Do not use LEAD_NOTIFICATION_EMAIL / OPERATOR_INBOX here (those are destinations).
 */
export function transactionalFromAddress(): string {
  return (
    process.env.RESEND_FROM?.trim() ||
    process.env.MY_INSURANCE_FROM_EMAIL?.trim() ||
    DEFAULT_TRANSACTIONAL_FROM
  );
}

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}
