import { isAgencyLike } from '@/lib/network-discovery/entity-type';
import type {
  DiscoveryEntity,
  QueryExampleResult,
  QueryMatchReason,
} from '@/lib/network-discovery/types';

function normCity(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase();
}

function cityEquals(entityCity: string | null, wanted: string): boolean {
  return normCity(entityCity) === wanted.toLowerCase();
}

/**
 * Evidence-only matcher. Never infers city from statewide license.
 * Does not implement Ask parser behavior for ambiguous queries.
 */
export function matchReasons(
  entity: DiscoveryEntity,
  wanted: {
    entityTypes?: Array<DiscoveryEntity['entity_type'] | 'agency_like'>;
    category?: string;
    physicalCity?: string;
    physicalState?: string;
    licensedState?: string;
    requirePhysicalCity?: boolean;
  }
): QueryMatchReason[] | null {
  const reasons: QueryMatchReason[] = [];

  if (wanted.entityTypes && wanted.entityTypes.length > 0) {
    const typeOk = wanted.entityTypes.some((t) => {
      if (t === 'agency_like') return isAgencyLike(entity.entity_type);
      return entity.entity_type === t;
    });
    if (!typeOk) return null;
    reasons.push('entity_type_match');
  }

  if (wanted.category) {
    if (!entity.categories.includes(wanted.category)) return null;
    reasons.push('category_match');
  }

  if (wanted.requirePhysicalCity && wanted.physicalCity) {
    if (!cityEquals(entity.physical_location.city, wanted.physicalCity)) {
      return null;
    }
    reasons.push('physical_city');
  } else if (wanted.physicalCity) {
    if (cityEquals(entity.physical_location.city, wanted.physicalCity)) {
      reasons.push('physical_city');
    } else {
      return null;
    }
  }

  if (wanted.physicalState) {
    if (entity.physical_location.state === wanted.physicalState) {
      reasons.push('physical_state');
    } else if (
      wanted.licensedState &&
      entity.licensed_service_states.includes(wanted.licensedState)
    ) {
      // Statewide license is reported separately and does not satisfy
      // an exact physical-state office claim when physical state is required.
      if (wanted.requirePhysicalCity || wanted.physicalCity) {
        return null;
      }
      reasons.push('licensed_service_state');
    } else {
      return null;
    }
  } else if (wanted.licensedState) {
    if (entity.licensed_service_states.includes(wanted.licensedState)) {
      reasons.push('licensed_service_state');
    } else if (entity.license_state === wanted.licensedState) {
      reasons.push('licensed_service_state');
    } else {
      return null;
    }
  }

  return reasons;
}

export const REQUIRED_QUERY_EXAMPLES = [
  'Medicare agents Indiana',
  'homeowners insurance agencies Miami FL',
  'auto insurance agencies Texas',
  'insurance agencies Dallas TX',
  'insurance carriers Florida',
  'flood insurance agencies Miami',
] as const;

function evaluateExample(
  query: (typeof REQUIRED_QUERY_EXAMPLES)[number],
  entities: DiscoveryEntity[]
): QueryExampleResult {
  const hits: QueryExampleResult['matches'] = [];

  const consider = (wanted: Parameters<typeof matchReasons>[1], notes: string) => {
    for (const entity of entities) {
      const reasons = matchReasons(entity, wanted);
      if (!reasons) continue;
      hits.push({
        network_id: entity.network_id,
        display_name: entity.display_name,
        entity_type: entity.entity_type,
        reasons,
      });
    }
    return notes;
  };

  let notes = '';
  switch (query) {
    case 'Medicare agents Indiana':
      notes = consider(
        {
          entityTypes: ['medicare_agent'],
          licensedState: 'IN',
        },
        'medicare_agent is UNSUPPORTED. Category-only medicare + IN license is not a medicare_agent match.'
      );
      break;
    case 'homeowners insurance agencies Miami FL':
      notes = consider(
        {
          entityTypes: ['agency_like'],
          category: 'homeowners',
          physicalCity: 'Miami',
          physicalState: 'FL',
          requirePhysicalCity: true,
        },
        'Requires explicit homeowners category and physical Miami, FL. Statewide FL license is not a Miami office.'
      );
      break;
    case 'auto insurance agencies Texas':
      notes = consider(
        {
          entityTypes: ['agency_like'],
          category: 'auto',
          licensedState: 'TX',
        },
        'Agency-like + auto category. TX may match physical_state or licensed_service_state; exact city is not claimed.'
      );
      // Re-run to also accept physical TX without licensed list — matchReasons
      // with licensedState only. If physical TX but licensed elsewhere, add those.
      for (const entity of entities) {
        if (hits.some((h) => h.network_id === entity.network_id)) continue;
        const reasons = matchReasons(entity, {
          entityTypes: ['agency_like'],
          category: 'auto',
          physicalState: 'TX',
        });
        if (!reasons) continue;
        hits.push({
          network_id: entity.network_id,
          display_name: entity.display_name,
          entity_type: entity.entity_type,
          reasons,
        });
      }
      break;
    case 'insurance agencies Dallas TX':
      notes = consider(
        {
          entityTypes: ['agency_like'],
          physicalCity: 'Dallas',
          physicalState: 'TX',
          requirePhysicalCity: true,
        },
        'Exact Dallas office only. TX license without physical Dallas is not a match.'
      );
      break;
    case 'insurance carriers Florida':
      notes = consider(
        {
          entityTypes: ['insurance_carrier'],
          physicalState: 'FL',
          licensedState: 'FL',
        },
        'Carrier registry has no NAIC, physical, or licensed-state fields. Brand-name “Florida” is not treated as service geography.'
      );
      break;
    case 'flood insurance agencies Miami':
      notes = consider(
        {
          entityTypes: ['agency_like'],
          category: 'flood',
          physicalCity: 'Miami',
          requirePhysicalCity: true,
        },
        'Requires explicit flood category and physical Miami. Flood is never inferred from homeowners.'
      );
      break;
    default:
      notes = 'Unknown example';
  }

  return {
    query,
    match_count: hits.length,
    matches: hits.slice(0, 25),
    notes,
  };
}

export function runQueryReadiness(entities: DiscoveryEntity[]): QueryExampleResult[] {
  return REQUIRED_QUERY_EXAMPLES.map((q) => evaluateExample(q, entities));
}

/**
 * Ambiguous consumer language is Ask's job. The feed must not define a
 * default interpretation for "insurance company near me".
 */
export const AMBIGUOUS_QUERY_POLICY =
  'Do not override Ask parser behavior for “insurance company near me”. The feed contains mixed entity types and must not establish a default interpretation.';
