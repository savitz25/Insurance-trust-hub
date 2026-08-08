/**
 * Minimal Resend outbound helper for Insurance Trust Hub.
 * Outbound only — never claims to receive inbound mail.
 */

import {
  isResendConfigured,
  operatorNotificationInbox,
  transactionalFromAddress,
} from '@/lib/email/routing';

export type SendEmailResult =
  | { ok: true; id?: string }
  | { ok: false; error: string; skipped?: boolean };

export async function sendResendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  /** Defaults to brand transactional from */
  from?: string;
  replyTo?: string | string[];
}): Promise<SendEmailResult> {
  if (!isResendConfigured()) {
    console.info('[email/resend] RESEND_API_KEY not set — skipped', params.subject);
    return {
      ok: false,
      skipped: true,
      error: 'RESEND_API_KEY not configured',
    };
  }

  const to = Array.isArray(params.to) ? params.to : [params.to];
  const body: Record<string, unknown> = {
    from: params.from || transactionalFromAddress(),
    to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  };
  if (params.replyTo) {
    body.reply_to = params.replyTo;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const raw = await res.text();
    if (!res.ok) {
      console.error('[email/resend] send failed', res.status, raw.slice(0, 400));
      return { ok: false, error: `Resend ${res.status}: ${raw.slice(0, 200)}` };
    }
    let id: string | undefined;
    try {
      const json = JSON.parse(raw) as { id?: string };
      id = json.id;
    } catch {
      // ignore
    }
    return { ok: true, id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'fetch_failed';
    console.error('[email/resend]', msg);
    return { ok: false, error: msg };
  }
}

/** Notify the monitored operator inbox; Reply-To = visitor when provided. */
export async function notifyOperator(params: {
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<SendEmailResult> {
  return sendResendEmail({
    to: operatorNotificationInbox(),
    subject: params.subject,
    html: params.html,
    text: params.text,
    replyTo: params.replyTo,
  });
}

export { isResendConfigured, operatorNotificationInbox, transactionalFromAddress };
