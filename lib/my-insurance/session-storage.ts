import type { ResearchSessionInput, ResearchSessionRow } from '@/lib/my-insurance/types';
import { GUEST_RESEARCH_SESSIONS_KEY } from '@/lib/my-insurance/constants';

function readAll(): ResearchSessionRow[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GUEST_RESEARCH_SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ResearchSessionRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(rows: ResearchSessionRow[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GUEST_RESEARCH_SESSIONS_KEY, JSON.stringify(rows.slice(0, 40)));
  window.dispatchEvent(new CustomEvent('ith-research-sessions'));
}

export function listGuestResearchSessions(): ResearchSessionRow[] {
  return readAll().sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function saveGuestResearchSession(input: ResearchSessionInput): ResearchSessionRow {
  const now = new Date().toISOString();
  const row: ResearchSessionRow = {
    ...input,
    id: `guest-session-${crypto.randomUUID?.() ?? Date.now()}`,
    created_at: now,
    updated_at: now,
  };
  writeAll([row, ...readAll().filter((r) => r.resumeHref !== input.resumeHref)]);
  return row;
}

export function removeGuestResearchSession(id: string): void {
  writeAll(readAll().filter((r) => r.id !== id));
}

export function guestSessionsForMerge(): ResearchSessionInput[] {
  return listGuestResearchSessions().map(
    ({
      title,
      source,
      providerSlug,
      providerName,
      hubPath,
      directoryHref,
      marketplaceZip,
      plannerHref,
      resumeHref,
      note,
    }) => ({
      title,
      source,
      providerSlug,
      providerName,
      hubPath,
      directoryHref,
      marketplaceZip,
      plannerHref,
      resumeHref,
      note,
    })
  );
}
