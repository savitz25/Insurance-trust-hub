import 'server-only';

import { PRODUCTION_SITE_ORIGIN } from '@/lib/my-insurance/constants';

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
    console.info('[my-insurance/email] RESEND_API_KEY not set — skipped', params.subject, params.to);
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

function layout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
        <tr><td style="background:#0f766e;padding:20px 24px;color:#fff;font-weight:700;font-size:18px;">
          Insurance Trust Hub
        </td></tr>
        <tr><td style="padding:28px 24px;">
          <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;">${title}</h1>
          ${bodyHtml}
          <p style="margin:24px 0 0;font-size:12px;color:#64748b;line-height:1.5;">
            Independent research workspace — no paid placements, no lead selling.
            Tools work without an account; sign-in only syncs your saved work.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function sendWelcomeEmail(params: { to: string }): Promise<boolean> {
  const hq = `${PRODUCTION_SITE_ORIGIN}/my-insurance`;
  const html = layout(
    'Welcome to Insurance HQ',
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
      Your My Insurance workspace is ready. Save agents, and soon prescription lists and calculator results —
      then open them from any device.
    </p>
    <p style="margin:0 0 20px;">
      <a href="${hq}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;font-size:14px;">
        Open Insurance HQ
      </a>
    </p>`
  );
  return sendResend({
    to: params.to,
    subject: 'Welcome to My Insurance — Insurance Trust Hub',
    html,
    text: `Welcome to Insurance HQ. Open your workspace: ${hq}`,
  });
}

export async function sendSavedProviderEmail(params: {
  to: string;
  providerName: string;
  providerSlug: string;
}): Promise<boolean> {
  const profile = `${PRODUCTION_SITE_ORIGIN}/providers/${params.providerSlug}`;
  const hq = `${PRODUCTION_SITE_ORIGIN}/my-insurance`;
  const html = layout(
    'Saved to My Insurance',
    `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#334155;">
      <strong>${escapeHtml(params.providerName)}</strong> is in your Insurance HQ shortlist.
    </p>
    <p style="margin:0 0 8px;">
      <a href="${profile}" style="color:#0f766e;font-weight:600;">View profile</a>
      &nbsp;·&nbsp;
      <a href="${hq}" style="color:#0f766e;font-weight:600;">Open Insurance HQ</a>
    </p>`
  );
  return sendResend({
    to: params.to,
    subject: `Saved: ${params.providerName} — My Insurance`,
    html,
    text: `Saved ${params.providerName}. Profile: ${profile}. HQ: ${hq}`,
  });
}

export async function sendMagicLinkEmail(params: {
  to: string;
  confirmUrl: string;
}): Promise<boolean> {
  const html = layout(
    'Your sign-in link',
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
      Use this secure link to sign in to My Insurance. It expires soon and can only be used once.
    </p>
    <p style="margin:0 0 20px;">
      <a href="${params.confirmUrl}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;font-size:14px;">
        Sign in to Insurance HQ
      </a>
    </p>
    <p style="margin:0;font-size:12px;color:#94a3b8;word-break:break-all;">${escapeHtml(params.confirmUrl)}</p>`
  );
  return sendResend({
    to: params.to,
    subject: 'Sign in to My Insurance — Insurance Trust Hub',
    html,
    text: `Sign in: ${params.confirmUrl}`,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
