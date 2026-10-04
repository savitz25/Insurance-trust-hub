/** Client-safe top-level Ask form. No signing material and no node:crypto. */

export const INSURANCE_PARENT_ORIGIN = 'https://www.asktrusthub.com';
export const HANDOFF_FORM_PATH = '/my/profile-save';
export const HANDOFF_TICKET_PREFIX = 'ith:insurance-handoff:v1:';

export type HandoffIntent = 'save' | 'save_signin' | 'unsave';
export type HandoffPhase = 'staged' | 'sent';
export type StoredHandoff = {
  slug: string;
  target: string;
  continuationRef: string;
  intent: HandoffIntent;
  phase: HandoffPhase;
  expiresAt: number;
};
export type TicketStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

const INTENTS = new Set<HandoffIntent>(['save', 'save_signin', 'unsave']);

/** Save always asks Ask to finish after My TrustHub sign-in. Unsave stays Unsave. */
export function browserHandoffIntent(intent: 'save' | 'unsave'): HandoffIntent {
  return intent === 'save' ? 'save_signin' : 'unsave';
}

export function handoffForm(
  target: string,
  continuationRef: string,
  intent: string,
  parentOrigin = INSURANCE_PARENT_ORIGIN,
): { action: string; continuationRef: string; intent: HandoffIntent } | null {
  if (!INTENTS.has(intent as HandoffIntent)) return null;
  if (!/^[A-Za-z0-9_-]{43}$/.test(continuationRef)) return null;
  let url: URL;
  try { url = new URL(target); } catch { return null; }
  if (url.origin !== parentOrigin || url.pathname !== HANDOFF_FORM_PATH || url.search || url.hash || url.username || url.password) return null;
  return { action: url.origin + url.pathname, continuationRef, intent: intent as HandoffIntent };
}

function ticketKey(slug: string): string {
  return HANDOFF_TICKET_PREFIX + slug;
}

export function rememberHandoff(store: TicketStore, ticket: StoredHandoff): void {
  store.setItem(ticketKey(ticket.slug), JSON.stringify(ticket));
}

export function readHandoff(store: TicketStore, slug: string, now: number): StoredHandoff | null {
  const raw = store.getItem(ticketKey(slug));
  if (!raw) return null;
  try {
    const ticket = JSON.parse(raw) as StoredHandoff;
    if (!ticket || ticket.slug !== slug || !INTENTS.has(ticket.intent) || (ticket.phase !== 'staged' && ticket.phase !== 'sent')) return null;
    if (!handoffForm(ticket.target, ticket.continuationRef, ticket.intent)) return null;
    if (!Number.isFinite(ticket.expiresAt) || ticket.expiresAt <= now) {
      store.removeItem(ticketKey(slug));
      return null;
    }
    return ticket;
  } catch {
    store.removeItem(ticketKey(slug));
    return null;
  }
}

/** A staged ticket submits when the page is visible. A sent ticket does not submit again. */
export function resumeDecision(ticket: StoredHandoff | null, visibilityState: string): 'submit' | 'hold' {
  if (!ticket || visibilityState === 'hidden') return 'hold';
  return ticket.phase === 'staged' ? 'submit' : 'hold';
}

export function markHandoffSent(store: TicketStore, ticket: StoredHandoff): StoredHandoff {
  const sent = { ...ticket, phase: 'sent' as const };
  rememberHandoff(store, sent);
  return sent;
}
