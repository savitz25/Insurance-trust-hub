import { PILOT_MAX, PILOT_MIN, PILOT_TARGET, type DiscoveryEntity } from '@/lib/network-discovery/types';
import { canonicalizeEntities } from '@/lib/network-discovery/fingerprint';
import { disambiguateNetworkId } from '@/lib/network-discovery/identity';

/**
 * Natural-representation pilot selection.
 *
 * Sort by network_id, then round-robin by license_state (or physical state,
 * then ZZ). Exhausted small groups drop out; leftover slots fill from
 * remaining groups. Does not force equal counts.
 */
export function selectPilotCohort(
  eligible: DiscoveryEntity[],
  target: number = PILOT_TARGET
): DiscoveryEntity[] {
  const size = Math.min(PILOT_MAX, Math.max(0, target));
  const unique = assignUniqueNetworkIds(dedupeBySource(eligible));
  const ordered = canonicalizeEntities(unique);

  if (ordered.length <= size) {
    return ordered;
  }

  const groups = new Map<string, DiscoveryEntity[]>();
  for (const entity of ordered) {
    const key =
      entity.license_state ||
      entity.physical_location.state ||
      'ZZ';
    const list = groups.get(key) ?? [];
    list.push(entity);
    groups.set(key, list);
  }

  const keys = Array.from(groups.keys()).sort();
  const indexes = new Map(keys.map((k) => [k, 0]));
  const selected: DiscoveryEntity[] = [];

  while (selected.length < size) {
    let progressed = false;
    for (const key of keys) {
      if (selected.length >= size) break;
      const list = groups.get(key) ?? [];
      const i = indexes.get(key) ?? 0;
      if (i >= list.length) continue;
      selected.push(list[i]);
      indexes.set(key, i + 1);
      progressed = true;
    }
    if (!progressed) break;
  }

  return canonicalizeEntities(selected);
}

export function dedupeBySource(entities: DiscoveryEntity[]): DiscoveryEntity[] {
  const seen = new Set<string>();
  const out: DiscoveryEntity[] = [];
  for (const entity of canonicalizeEntities(entities)) {
    const key = `${entity.source_table}:${entity.source_pk}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entity);
  }
  return out;
}

export function assignUniqueNetworkIds(
  entities: DiscoveryEntity[]
): DiscoveryEntity[] {
  const used = new Set<string>();
  const out: DiscoveryEntity[] = [];
  for (const entity of canonicalizeEntities(entities)) {
    let id = entity.network_id;
    if (used.has(id)) {
      id = disambiguateNetworkId(entity.network_id, entity.source_pk);
    }
    let n = 2;
    while (used.has(id)) {
      id = `${entity.network_id}:src:${entity.source_pk}:${n}`;
      n += 1;
    }
    used.add(id);
    out.push(id === entity.network_id ? entity : { ...entity, network_id: id });
  }
  return canonicalizeEntities(out);
}

export function dedupeIdentities(entities: DiscoveryEntity[]): DiscoveryEntity[] {
  return assignUniqueNetworkIds(dedupeBySource(entities));
}

export function assertPilotSize(count: number): { ok: boolean; reason: string | null } {
  if (count < PILOT_MIN) {
    return {
      ok: false,
      reason: `eligible/selected ${count} < PILOT_MIN ${PILOT_MIN}`,
    };
  }
  if (count > PILOT_MAX) {
    return {
      ok: false,
      reason: `selected ${count} > PILOT_MAX ${PILOT_MAX}`,
    };
  }
  return { ok: true, reason: null };
}
