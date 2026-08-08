'use server';

import {
  contactFormSchema,
  CONTACT_SUBJECT_LABELS,
  type ContactFormValues,
} from '@/lib/validations/forms';
import { notifyOperator, isResendConfigured } from '@/lib/email/resend';
import { PUBLIC_CONTACT_EMAIL } from '@/lib/email/routing';

export type ContactActionResult =
  | { success: true }
  | { success: false; error: string };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Contact form → Resend notification to monitored operator inbox.
 * Reply-To = visitor. Public mailto still shows hello@ (inbound MX separate).
 */
export async function submitContactForm(
  input: ContactFormValues
): Promise<ContactActionResult> {
  const parsed = contactFormSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid form data',
    };
  }

  if (parsed.data.website) {
    return { success: true };
  }

  const { name, email, subject, message } = parsed.data;
  const subjectLabel = CONTACT_SUBJECT_LABELS[subject] ?? subject;

  console.info('[submitContactForm] Message received', {
    name,
    email,
    subject,
    resendConfigured: isResendConfigured(),
  });

  const text = [
    `Insurance Trust Hub contact form`,
    `Subject: ${subjectLabel}`,
    `From: ${name} <${email}>`,
    `Public brand address: ${PUBLIC_CONTACT_EMAIL}`,
    ``,
    message,
  ].join('\n');

  const html = `
    <div style="font-family:system-ui,sans-serif;font-size:14px;color:#0A2540;line-height:1.5">
      <p><strong>Insurance Trust Hub — contact form</strong></p>
      <p>
        <strong>Subject:</strong> ${escapeHtml(subjectLabel)}<br/>
        <strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;<br/>
        <strong>Brand address (public):</strong> ${escapeHtml(PUBLIC_CONTACT_EMAIL)}
      </p>
      <hr style="border:none;border-top:1px solid #E2E8F0;margin:16px 0"/>
      <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
      <p style="font-size:12px;color:#64748B;margin-top:24px">
        Delivered via Resend to the operator inbox. Reply uses Reply-To = visitor email.
      </p>
    </div>
  `;

  const sent = await notifyOperator({
    subject: `[ITH Contact] ${subjectLabel} — ${name}`,
    html,
    text,
    replyTo: email,
  });

  if (!sent.ok) {
    if (sent.skipped) {
      // Dev / missing key: do not pretend delivery succeeded to the user.
      return {
        success: false,
        error: `Email delivery is temporarily unavailable. Please email ${PUBLIC_CONTACT_EMAIL} directly (or set RESEND_API_KEY).`,
      };
    }
    return {
      success: false,
      error: `Unable to send your message right now. Please email ${PUBLIC_CONTACT_EMAIL} or try again later.`,
    };
  }

  return { success: true };
}
