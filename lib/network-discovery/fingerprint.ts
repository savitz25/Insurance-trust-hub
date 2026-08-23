import { createHash } from 'node:crypto';
import type { DiscoveryEntity, DiscoveryFeed } from '@/lib/network-discovery/types';

function sortedObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortedObject);
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      out[key] = sortedObject(obj[key]);
    }
    return out;
  }
  return value;
}

export function canonicalizeEntities(entities: DiscoveryEntity[]): DiscoveryEntity[] {
  return [...entities]
    .map((e) => ({
      ...e,
      licensed_service_states: [...e.licensed_service_states].sort(),
      categories: [...e.categories].sort(),
    }))
    .sort((a, b) => {
      if (a.network_id === b.network_id) {
        return a.source_pk.localeCompare(b.source_pk);
      }
      return a.network_id.localeCompare(b.network_id);
    });
}

/** Content hash over entities only — generated_at is volatile. */
export function fingerprintEntities(entities: DiscoveryEntity[]): string {
  const canonical = canonicalizeEntities(entities);
  const payload = JSON.stringify(sortedObject(canonical));
  return createHash('sha256').update(payload).digest('hex');
}

export function membershipSet(entities: DiscoveryEntity[]): string[] {
  return canonicalizeEntities(entities).map((e) => e.network_id);
}

export function identityPairs(entities: DiscoveryEntity[]): string[] {
  return canonicalizeEntities(entities).map(
    (e) => `${e.network_id}|${e.source_table}|${e.source_pk}|${e.entity_type}`
  );
}

export type StabilityDiff = {
  membership_drift: number;
  identity_drift: number;
  content_fingerprint_drift: number;
  fingerprint_a: string;
  fingerprint_b: string;
};

export function compareStability(
  a: Pick<DiscoveryFeed, 'fingerprint' | 'entities'>,
  b: Pick<DiscoveryFeed, 'fingerprint' | 'entities'>
): StabilityDiff {
  const memA = new Set(membershipSet(a.entities));
  const memB = new Set(membershipSet(b.entities));
  let membership_drift = 0;
  for (const id of memA) if (!memB.has(id)) membership_drift += 1;
  for (const id of memB) if (!memA.has(id)) membership_drift += 1;

  const idA = new Set(identityPairs(a.entities));
  const idB = new Set(identityPairs(b.entities));
  let identity_drift = 0;
  for (const row of idA) if (!idB.has(row)) identity_drift += 1;
  for (const row of idB) if (!idA.has(row)) identity_drift += 1;

  const fa = a.fingerprint || fingerprintEntities(a.entities);
  const fb = b.fingerprint || fingerprintEntities(b.entities);

  return {
    membership_drift,
    identity_drift,
    content_fingerprint_drift: fa === fb ? 0 : 1,
    fingerprint_a: fa,
    fingerprint_b: fb,
  };
}
