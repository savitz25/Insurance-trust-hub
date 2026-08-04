import 'server-only';

import { PRODUCTION_SITE_ORIGIN } from '@/lib/my-insurance/constants';

/**
 * Absolute logo for email clients (must not depend on which Vercel project
 * currently holds the apex domain). Monorepo serves assets under /insurance/brand;
 * override with MY_INSURANCE_EMAIL_LOGO_URL if the host map changes.
 */
const EMAIL_LOGO_URL =
  process.env.MY_INSURANCE_EMAIL_LOGO_URL?.trim() ||
  'https://www.insurancetrusthub.com/insurance/brand/insurance-trust-hub-logo-header.png';

/** Insurance Trust Hub transactional email brand tokens (inline CSS for clients). */
const BRAND = {
  name: 'Insurance Trust Hub',
  product: 'Insurance HQ',
  siteUrl: PRODUCTION_SITE_ORIGIN.includes('insurancetrusthub.com')
    ? PRODUCTION_SITE_ORIGIN
    : 'https://www.insurancetrusthub.com',
  siteHost: 'insurancetrusthub.com',
  logoUrl: EMAIL_LOGO_URL,
  /** Teal  -  primary CTAs & brand accent */
  primary: '#0f766e',
  primaryDark: '#0d5f59',
  /** Deep navy for headlines */
  ink: '#0f172a',
  body: '#334155',
  muted: '#64748b',
  faint: '#94a3b8',
  border: '#e2e8f0',
  bg: '#f1f5f9',
  card: '#ffffff',
  supportEmail: 'hello@insurancetrusthub.com',
  trustLine: 'Independent research workspace  -  no paid placements, no lead selling.',
} as const;

function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function fromAddress(): string {
  return (
    process.env.MY_INSURANCE_FROM_EMAIL?.trim() ||
    process.env.LEAD_NOTIFICATION_EMAIL?.trim() ||
    'Insurance Trust Hub <hello@insurancetrusthub.com>'
  );
}

async function sendResend(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<boolean> {
  if (!isResendConfigured()) {
    console.info('[my-insurance/email] RESEND_API_KEY not set  -  skipped', params.subject, params.to);
    return false;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('[my-insurance/email] Resend failed', res.status, body);
    return false;
  }
  return true;
}

type LayoutOptions = {
  /** Inbox preview (hidden preheader) */
  preheader: string;
  /** Document / card title */
  title: string;
  /** Main HTML body (paragraphs, lists) */
  bodyHtml: string;
  /** Primary button */
  ctaLabel?: string;
  ctaHref?: string;
  /** Small note under CTA (expiry, etc.) */
  noteHtml?: string;
  /** Optional secondary links row under CTA */
  secondaryHtml?: string;
};

/**
 * Premium single-column shell  -  table layout + inline CSS for Gmail/Outlook/Apple Mail.
 * Auth URLs are never rewritten here; pass confirmUrl through as-is.
 */
function buildEmailHtml(options: LayoutOptions): string {
  const { preheader, title, bodyHtml, ctaLabel, ctaHref, noteHtml, secondaryHtml } = options;
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  const ctaBlock =
    ctaLabel && ctaHref
      ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0;">
        <tr>
          <td align="left" style="border-radius:10px;background:${BRAND.primary};">
            <a href="${ctaHref}" target="_blank" rel="noopener noreferrer"
              style="display:inline-block;padding:14px 28px;font-family:${font};font-size:15px;font-weight:600;line-height:1.2;color:#ffffff;text-decoration:none;border-radius:10px;">
              ${ctaLabel}
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0;font-family:${font};font-size:12px;line-height:1.55;color:${BRAND.muted};">
        If the button doesn't work, copy and paste this link into your browser:
      </p>
      <p style="margin:6px 0 0;font-family:${font};font-size:12px;line-height:1.5;word-break:break-all;">
        <a href="${ctaHref}" style="color:${BRAND.primary};text-decoration:underline;">${escapeHtml(ctaHref)}</a>
      </p>`
      : '';

  const note = noteHtml
    ? `<p style="margin:20px 0 0;font-family:${font};font-size:13px;line-height:1.55;color:${BRAND.muted};">${noteHtml}</p>`
    : '';

  const secondary = secondaryHtml
    ? `<div style="margin:20px 0 0;font-family:${font};font-size:14px;line-height:1.5;">${secondaryHtml}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(title)}  -  ${BRAND.name}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};-webkit-text-size-adjust:100%;">
  <!-- Preheader (inbox preview) -->
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
    ${escapeHtml(preheader)}
    &#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.bg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
          <!-- Brand header -->
          <tr>
            <td align="center" style="padding:0 0 20px;">
              <a href="${BRAND.siteUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
                <img src="${BRAND.logoUrl}" alt="${BRAND.name}" width="220" height="48"
                  style="display:block;width:220px;max-width:70%;height:auto;border:0;" />
              </a>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:14px;overflow:hidden;">
              <!-- Accent bar -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="height:4px;line-height:4px;font-size:0;background:${BRAND.primary};">&nbsp;</td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:32px 28px 28px;">
                    <p style="margin:0 0 8px;font-family:${font};font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${BRAND.primary};">
                      My Insurance · ${BRAND.product}
                    </p>
                    <h1 style="margin:0 0 16px;font-family:${font};font-size:22px;line-height:1.25;font-weight:600;color:${BRAND.ink};">
                      ${escapeHtml(title)}
                    </h1>
                    <div style="font-family:${font};font-size:15px;line-height:1.65;color:${BRAND.body};">
                      ${bodyHtml}
                    </div>
                    ${ctaBlock}
                    ${note}
                    ${secondary}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Trust + footer -->
          <tr>
            <td style="padding:28px 12px 8px;text-align:center;">
              <p style="margin:0 0 12px;font-family:${font};font-size:12px;line-height:1.55;color:${BRAND.muted};">
                ${BRAND.trustLine}
              </p>
              <p style="margin:0 0 8px;font-family:${font};font-size:12px;line-height:1.5;color:${BRAND.muted};">
                <a href="${BRAND.siteUrl}" style="color:${BRAND.primary};text-decoration:none;font-weight:600;">${BRAND.name}</a>
                &nbsp; · &nbsp;
                <a href="${BRAND.siteUrl}" style="color:${BRAND.primary};text-decoration:none;">${BRAND.siteHost}</a>
              </p>
              <p style="margin:0 0 8px;font-family:${font};font-size:12px;line-height:1.5;color:${BRAND.muted};">
                <a href="${BRAND.siteUrl}/my-insurance" style="color:${BRAND.primary};text-decoration:none;">My Insurance</a>
                &nbsp; · &nbsp;
                <a href="${BRAND.siteUrl}/tools" style="color:${BRAND.primary};text-decoration:none;">Tools</a>
                &nbsp; · &nbsp;
                <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.primary};text-decoration:none;">${BRAND.supportEmail}</a>
              </p>
              <p style="margin:12px 0 0;font-family:${font};font-size:11px;line-height:1.5;color:${BRAND.faint};">
                If you didn't request this email, you can ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendWelcomeEmail(params: { to: string }): Promise<boolean> {
  const hq = `${PRODUCTION_SITE_ORIGIN}/my-insurance`;
  const html = buildEmailHtml({
    preheader: 'Your Insurance HQ workspace is ready  -  open My Insurance anytime.',
    title: 'Welcome to Insurance HQ',
    bodyHtml: `<p style="margin:0 0 12px;">
      Your My Insurance workspace is ready. Save agents you trust, and soon prescription lists and calculator results  - 
      then open them from any device.
    </p>
    <p style="margin:0;">
      Tools work without an account; sign-in only syncs your saved work.
    </p>`,
    ctaLabel: 'Open Insurance HQ',
    ctaHref: hq,
  });
  return sendResend({
    to: params.to,
    subject: 'Welcome to My Insurance  -  Insurance Trust Hub',
    html,
    text: [
      'Welcome to Insurance HQ',
      '',
      'Your My Insurance workspace is ready. Save agents, and open them from any device.',
      '',
      `Open Insurance HQ: ${hq}`,
      '',
      BRAND.trustLine,
      `${BRAND.name} · ${BRAND.siteHost}`,
      "If you didn't request this email, you can ignore it.",
    ].join('\n'),
  });
}

export async function sendSavedProviderEmail(params: {
  to: string;
  providerName: string;
  providerSlug: string;
}): Promise<boolean> {
  const profile = `${PRODUCTION_SITE_ORIGIN}/providers/${params.providerSlug}`;
  const hq = `${PRODUCTION_SITE_ORIGIN}/my-insurance`;
  const name = escapeHtml(params.providerName);
  const html = buildEmailHtml({
    preheader: `${params.providerName} was saved to your Insurance HQ shortlist.`,
    title: 'Saved to My Insurance',
    bodyHtml: `<p style="margin:0;">
      <strong style="color:${BRAND.ink};">${name}</strong> is now in your Insurance HQ shortlist.
      Open the profile anytime, or return to HQ to compare what you've saved.
    </p>`,
    ctaLabel: 'Open Insurance HQ',
    ctaHref: hq,
    secondaryHtml: `<a href="${profile}" style="color:${BRAND.primary};font-weight:600;text-decoration:none;">View ${name} profile →</a>`,
  });
  return sendResend({
    to: params.to,
    subject: `Saved: ${params.providerName}  -  My Insurance`,
    html,
    text: [
      'Saved to My Insurance',
      '',
      `${params.providerName} is in your Insurance HQ shortlist.`,
      '',
      `Profile: ${profile}`,
      `Insurance HQ: ${hq}`,
      '',
      BRAND.trustLine,
      `${BRAND.name} · ${BRAND.siteHost}`,
    ].join('\n'),
  });
}

export async function sendDrugBasketEmail(params: {
  to: string;
  basketName: string;
  items: Array<{
    name: string;
    strength: string;
    form?: string;
    dosage: string;
    quantity?: string | null;
    notes?: string | null;
  }>;
}): Promise<boolean> {
  const hq = `${PRODUCTION_SITE_ORIGIN}/my-insurance`;
  const tool = `${PRODUCTION_SITE_ORIGIN}/tools/prescription-drug-list`;
  const listHtml = params.items
    .map((item, i) => {
      const bits = [
        `<strong style="color:${BRAND.ink};">${escapeHtml(item.name)}</strong> ${escapeHtml(item.strength)}`,
        item.form ? `(${escapeHtml(item.form)})` : '',
        `<br/><span style="color:${BRAND.muted};">Dosage: ${escapeHtml(item.dosage)}</span>`,
        item.quantity
          ? `<br/><span style="color:${BRAND.muted};">Qty: ${escapeHtml(item.quantity)}</span>`
          : '',
        item.notes
          ? `<br/><span style="color:${BRAND.muted};">Notes: ${escapeHtml(item.notes)}</span>`
          : '',
      ]
        .filter(Boolean)
        .join(' ');
      return `<tr><td style="padding:10px 0;border-bottom:1px solid ${BRAND.border};font-size:14px;line-height:1.5;">${i + 1}. ${bits}</td></tr>`;
    })
    .join('');

  const html = buildEmailHtml({
    preheader: `${params.items.length} medication${params.items.length === 1 ? '' : 's'} saved in Insurance HQ`,
    title: 'Your prescription drug list',
    bodyHtml: `<p style="margin:0 0 12px;">
      <strong style="color:${BRAND.ink};">${escapeHtml(params.basketName)}</strong> is saved in your
      My Insurance workspace (${params.items.length} medication${params.items.length === 1 ? '' : 's'}).
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 0;">
      ${listHtml}
    </table>
    <p style="margin:16px 0 0;font-size:13px;color:${BRAND.muted};">
      Educational organization tool only  -  not medical advice. Verify with your pharmacist or doctor.
    </p>`,
    ctaLabel: 'Open Insurance HQ',
    ctaHref: hq,
    secondaryHtml: `<a href="${tool}" style="color:${BRAND.primary};font-weight:600;text-decoration:none;">Edit drug list →</a>`,
  });

  const textLines = [
    `Prescription list: ${params.basketName}`,
    '',
    ...params.items.map(
      (item, i) =>
        `${i + 1}. ${item.name} ${item.strength}${item.form ? ` (${item.form})` : ''}  -  ${item.dosage}`
    ),
    '',
    `Insurance HQ: ${hq}`,
    BRAND.trustLine,
  ];

  return sendResend({
    to: params.to,
    subject: `Your prescription list  -  My Insurance`,
    html,
    text: textLines.join('\n'),
  });
}

export async function sendSavedCalculatorEmail(params: {
  to: string;
  toolLabel: string;
  title: string;
  summaryText: string;
  sourcePath?: string;
}): Promise<boolean> {
  const hq = `${PRODUCTION_SITE_ORIGIN}/my-insurance`;
  const toolUrl = params.sourcePath
    ? `${PRODUCTION_SITE_ORIGIN}${params.sourcePath.startsWith('/') ? params.sourcePath : `/${params.sourcePath}`}`
    : hq;

  const html = buildEmailHtml({
    preheader: `${params.toolLabel} saved to Insurance HQ`,
    title: 'Calculator result saved',
    bodyHtml: `<p style="margin:0 0 12px;">
      <strong style="color:${BRAND.ink};">${escapeHtml(params.toolLabel)}</strong> is in your My Insurance workspace.
    </p>
    <p style="margin:0 0 8px;font-weight:600;color:${BRAND.ink};">${escapeHtml(params.title)}</p>
    <p style="margin:0;color:${BRAND.body};">${escapeHtml(params.summaryText)}</p>
    <p style="margin:16px 0 0;font-size:13px;color:${BRAND.muted};">
      Educational estimates only  -  not a quote, enrollment decision, or financial advice.
    </p>`,
    ctaLabel: 'Open Insurance HQ',
    ctaHref: hq,
    secondaryHtml: `<a href="${toolUrl}" style="color:${BRAND.primary};font-weight:600;text-decoration:none;">Re-run this tool →</a>`,
  });

  return sendResend({
    to: params.to,
    subject: `Saved: ${params.toolLabel}  -  My Insurance`,
    html,
    text: [
      'Calculator result saved',
      '',
      params.toolLabel,
      params.title,
      params.summaryText,
      '',
      `Insurance HQ: ${hq}`,
      BRAND.trustLine,
    ].join('\n'),
  });
}

export async function sendComparisonSummaryEmail(params: {
  to: string;
  title: string;
  providers: Array<{ name: string; slug: string }>;
  comparisonId?: string;
}): Promise<boolean> {
  const hq = `${PRODUCTION_SITE_ORIGIN}/my-insurance`;
  const compareUrl = params.comparisonId
    ? `${PRODUCTION_SITE_ORIGIN}/my-insurance/compare?id=${encodeURIComponent(params.comparisonId)}`
    : `${PRODUCTION_SITE_ORIGIN}/my-insurance/compare?${params.providers.map((p) => `add=${encodeURIComponent(p.slug)}`).join('&')}`;

  const listHtml = params.providers
    .map(
      (p, i) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid ${BRAND.border};font-size:14px;">
          ${i + 1}. <strong style="color:${BRAND.ink};">${escapeHtml(p.name)}</strong>
          <br/><a href="${PRODUCTION_SITE_ORIGIN}/providers/${escapeHtml(p.slug)}" style="color:${BRAND.primary};font-size:12px;">View profile</a>
        </td></tr>`
    )
    .join('');

  const html = buildEmailHtml({
    preheader: `Your agent comparison (${params.providers.length} agencies)`,
    title: 'Agent comparison saved',
    bodyHtml: `<p style="margin:0 0 12px;">
      <strong style="color:${BRAND.ink};">${escapeHtml(params.title)}</strong> is in Insurance HQ.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${listHtml}</table>
    <p style="margin:16px 0 0;font-size:13px;color:${BRAND.muted};">
      Independent directory research only  -  not a recommendation, quote, or official endorsement.
    </p>`,
    ctaLabel: 'Open comparison',
    ctaHref: compareUrl,
    secondaryHtml: `<a href="${hq}" style="color:${BRAND.primary};font-weight:600;text-decoration:none;">Insurance HQ →</a>`,
  });

  return sendResend({
    to: params.to,
    subject: `Comparison: ${params.title}  -  My Insurance`,
    html,
    text: [
      'Agent comparison saved',
      params.title,
      '',
      ...params.providers.map((p, i) => `${i + 1}. ${p.name}`),
      '',
      `Open: ${compareUrl}`,
      BRAND.trustLine,
    ].join('\n'),
  });
}

export async function sendReviewSubmittedEmail(params: {
  to: string;
  providerName: string;
  providerSlug: string;
  rating: number;
  status: string;
}): Promise<boolean> {
  const hq = `${PRODUCTION_SITE_ORIGIN}/my-insurance`;
  const profile = `${PRODUCTION_SITE_ORIGIN}/providers/${params.providerSlug}`;
  const pendingNote =
    params.status === 'published'
      ? 'Your review is published on the agency profile.'
      : 'Your review is pending moderation before it appears publicly. You can still see it in Insurance HQ.';

  const html = buildEmailHtml({
    preheader: `Review submitted for ${params.providerName}`,
    title: 'Review received',
    bodyHtml: `<p style="margin:0 0 12px;">
      Thanks for sharing your experience with
      <strong style="color:${BRAND.ink};">${escapeHtml(params.providerName)}</strong>
      (${params.rating} star${params.rating === 1 ? '' : 's'}).
    </p>
    <p style="margin:0;color:${BRAND.body};">${escapeHtml(pendingNote)}</p>
    <p style="margin:16px 0 0;font-size:13px;color:${BRAND.muted};">
      InsuranceTrustHub is an independent research directory  -  reviews do not imply DOI/CMS endorsement.
    </p>`,
    ctaLabel: 'Open Insurance HQ',
    ctaHref: hq,
    secondaryHtml: `<a href="${profile}" style="color:${BRAND.primary};font-weight:600;text-decoration:none;">View agency profile →</a>`,
  });

  return sendResend({
    to: params.to,
    subject: `Review submitted  -  ${params.providerName}`,
    html,
    text: [
      'Review received',
      `${params.providerName} · ${params.rating} stars`,
      pendingNote,
      `HQ: ${hq}`,
      BRAND.trustLine,
    ].join('\n'),
  });
}

export async function sendMagicLinkEmail(params: {
  to: string;
  confirmUrl: string;
}): Promise<boolean> {
  // confirmUrl must be passed through unchanged (token_hash, type, next, etc.)
  const html = buildEmailHtml({
    preheader: 'Sign in to your InsuranceTrustHub research workspace',
    title: 'Sign in to Insurance HQ',
    bodyHtml: `<p style="margin:0;">
      Use this secure one-time link to open your My Insurance workspace and access saved agents,
      research, and future baskets and results.
    </p>`,
    ctaLabel: 'Sign in to Insurance HQ',
    ctaHref: params.confirmUrl,
    noteHtml:
      "This link expires soon and can only be used once. For your security, don't forward this email.",
  });
  return sendResend({
    to: params.to,
    subject: 'Sign in to My Insurance  -  Insurance Trust Hub',
    html,
    text: [
      'Sign in to Insurance HQ',
      '',
      'Use this secure one-time link to open your My Insurance workspace.',
      '',
      params.confirmUrl,
      '',
      'This link expires soon and can only be used once.',
      '',
      BRAND.trustLine,
      `${BRAND.name} · ${BRAND.siteHost}`,
      "If you didn't request this email, you can ignore it.",
    ].join('\n'),
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
