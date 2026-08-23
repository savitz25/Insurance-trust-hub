import { US_STATES } from '@/lib/constants';
import {
  ASK_NETWORK_DISCOVERY_SCHEMA,
  DISCOVERY_ENTITY_TYPES,
  DISCOVERY_STATUSES,
  FORBIDDEN_EXPORT_KEYS,
  INSURANCE_HUB,
  PILOT_BANNER,
  type DiscoveryFeed,
} from '@/lib/network-discovery/types';
import { fingerprintEntities, canonicalizeEntities } from '@/lib/network-discovery/fingerprint';
import { isSupportedDiscoveryType } from '@/lib/network-discovery/entity-type';
import { isValidStateCode } from '@/lib/network-discovery/geography';
import { validateCanonicalProfileUrl } from '@/lib/network-discovery/urls';

const STATE_CODES = new Set(US_STATES.map((s) => s.code));

export type ValidationIssue = {
  code: string;
  message: string;
};

function walkForbidden(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => walkForbidden(v, `${path}[${i}]`, issues));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const lower = k.toLowerCase();
      for (const forbidden of FORBIDDEN_EXPORT_KEYS) {
        if (k === forbidden || lower === forbidden.toLowerCase()) {
          issues.push({
            code: 'forbidden_field',
            message: `${path}.${k} is forbidden in discovery export`,
          });
        }
      }
      walkForbidden(v, `${path}.${k}`, issues);
    }
  }
}

export function validateDiscoveryFeed(feed: DiscoveryFeed): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (feed.schema_version !== ASK_NETWORK_DISCOVERY_SCHEMA) {
    issues.push({
      code: 'schema_version',
      message: `expected ${ASK_NETWORK_DISCOVERY_SCHEMA}, got ${feed.schema_version}`,
    });
  }
  if (feed.hub !== INSURANCE_HUB) {
    issues.push({ code: 'hub', message: `expected hub=insurance, got ${feed.hub}` });
  }
  if (feed.banner !== PILOT_BANNER) {
    issues.push({ code: 'banner', message: 'missing PILOT / NOT YET CONSUMED banner' });
  }
  if (!Array.isArray(feed.entities)) {
    issues.push({ code: 'entities', message: 'entities must be an array' });
    return issues;
  }
  if (feed.entity_count !== feed.entities.length) {
    issues.push({
      code: 'entity_count',
      message: `entity_count ${feed.entity_count} != entities.length ${feed.entities.length}`,
    });
  }

  const canonical = canonicalizeEntities(feed.entities);
  const ordered = feed.entities.map((e) => e.network_id).join('\n');
  const expectedOrder = canonical.map((e) => e.network_id).join('\n');
  if (ordered !== expectedOrder) {
    issues.push({
      code: 'deterministic_ordering',
      message: 'entities are not sorted by network_id',
    });
  }

  const expectedFp = fingerprintEntities(feed.entities);
  if (feed.fingerprint !== expectedFp) {
    issues.push({
      code: 'fingerprint',
      message: 'fingerprint does not match canonical entity payload',
    });
  }

  const seen = new Set<string>();
  for (const entity of feed.entities) {
    if (!entity.network_id) {
      issues.push({ code: 'network_id', message: 'missing network_id' });
      continue;
    }
    if (seen.has(entity.network_id)) {
      issues.push({
        code: 'unique_network_id',
        message: `duplicate network_id ${entity.network_id}`,
      });
    }
    seen.add(entity.network_id);

    if (!isSupportedDiscoveryType(entity.entity_type)) {
      issues.push({
        code: 'entity_type',
        message: `unsupported entity_type ${entity.entity_type}`,
      });
    }
    if (entity.entity_type === 'medicare_agent') {
      issues.push({
        code: 'medicare_entity_class',
        message: 'medicare_agent is UNSUPPORTED and must not be emitted',
      });
    }
    if (!DISCOVERY_ENTITY_TYPES.includes(entity.entity_type)) {
      issues.push({
        code: 'entity_type',
        message: `unknown entity_type ${entity.entity_type}`,
      });
    }
    if (entity.medicare_entity_class !== false) {
      issues.push({
        code: 'medicare_entity_class',
        message: `${entity.network_id} must not claim medicare_entity_class`,
      });
    }
    if (!DISCOVERY_STATUSES.includes(entity.discovery_status)) {
      issues.push({
        code: 'discovery_status',
        message: `invalid discovery_status on ${entity.network_id}`,
      });
    }
    if (entity.discovery_status !== 'eligible') {
      issues.push({
        code: 'discovery_status',
        message: `pilot entity ${entity.network_id} is not eligible`,
      });
    }

    const kind = entity.entity_type === 'insurance_carrier' ? 'carrier' : 'provider';
    const url = validateCanonicalProfileUrl(entity.profile_url, kind);
    if (!url.ok) {
      issues.push({
        code: 'canonical_profile_url',
        message: `${entity.network_id} invalid profile_url: ${url.reasons.join(',')}`,
      });
    }

    const phys = entity.physical_location?.state;
    if (phys && !isValidStateCode(phys)) {
      issues.push({
        code: 'physical_state',
        message: `${entity.network_id} invalid physical state ${phys}`,
      });
    }
    if (entity.license_state && !STATE_CODES.has(entity.license_state as never)) {
      issues.push({
        code: 'license_state',
        message: `${entity.network_id} invalid license_state ${entity.license_state}`,
      });
    }
    for (const st of entity.licensed_service_states) {
      if (!STATE_CODES.has(st as never)) {
        issues.push({
          code: 'licensed_service_state',
          message: `${entity.network_id} invalid licensed state ${st}`,
        });
      }
    }

    if (entity.identity_kind === 'doi_license' && !entity.network_id.startsWith('insurance:doi:')) {
      issues.push({
        code: 'identity_consistency',
        message: `${entity.network_id} identity_kind mismatch`,
      });
    }
    if (entity.identity_kind === 'npn' && !entity.network_id.startsWith('insurance:npn:')) {
      issues.push({
        code: 'identity_consistency',
        message: `${entity.network_id} identity_kind mismatch`,
      });
    }
    if (
      entity.identity_kind === 'provider_uuid' &&
      !entity.network_id.startsWith('insurance:provider:')
    ) {
      issues.push({
        code: 'identity_consistency',
        message: `${entity.network_id} identity_kind mismatch`,
      });
    }
    if (
      entity.identity_kind === 'carrier_slug' &&
      !entity.network_id.startsWith('insurance:carrier:')
    ) {
      issues.push({
        code: 'identity_consistency',
        message: `${entity.network_id} identity_kind mismatch`,
      });
    }
  }

  walkForbidden(feed, 'feed', issues);
  return issues;
}

export function assertValidFeed(feed: DiscoveryFeed): void {
  const issues = validateDiscoveryFeed(feed);
  if (issues.length > 0) {
    const msg = issues
      .slice(0, 20)
      .map((i) => `${i.code}: ${i.message}`)
      .join('\n');
    throw new Error(`Discovery snapshot failed validation:\n${msg}`);
  }
}
