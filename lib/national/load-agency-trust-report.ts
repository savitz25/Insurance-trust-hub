/**
 * INS-NAT-FINAL-005 — server-only Agency Trust Report loader.
 * Loads graph data only for a CONFIRMED provider→agency NPN bridge.
 * Fail-closed: missing admin, missing bridge, person entity, or errors → null.
 */
import 'server-only';

import { createClient } from '@supabase/supabase-js';
import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  isSupabaseAdminConfigured,
} from '@/lib/supabase/config';
import {
  buildAgencyTrustReport,
  PERSON_APPOINTMENT_TYPE,
} from '@/lib/national/agency-trust-report';
import type { InsuranceAgencyTrustReportV1 } from '@/lib/national/agency-trust-report';
import { classifyAgencyPublicationReadiness } from '@/lib/national/provider-graph-bridge';
import { mayPublishRegulatoryEvidenceRecord } from '@/lib/national/regulatory-display';

const CREDENTIAL_CAP = 80;
const LOA_CAP = 80;
const APPOINTMENT_CAP = 80;
const CONTACT_CAP = 40;
const CMS_CAP = 20;

export async function loadAgencyTrustReportForProvider(
  providerId: string | null | undefined
): Promise<InsuranceAgencyTrustReportV1 | null> {
  if (!providerId || !isSupabaseAdminConfigured()) return null;
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) return null;
  try {
    const sb = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: bridge, error: berr } = await sb
      .from('provider_entity_bridges')
      .select('entity_id,confidence,match_method')
      .eq('provider_id', providerId)
      .maybeSingle();
    if (berr || !bridge?.entity_id) return null;
    if (bridge.confidence !== 'CONFIRMED') return null;
    if (bridge.match_method !== 'exact_npn') return null;

    const { data: entity, error: eerr } = await sb
      .from('national_entities')
      .select('id,entity_kind,npn,legal_name,display_name,identity_confidence')
      .eq('id', bridge.entity_id)
      .maybeSingle();
    if (eerr || !entity || entity.entity_kind !== 'agency') return null;

    const [
      credRes,
      loaRes,
      relRes,
      contactRes,
      cmsRes,
      evRes,
    ] = await Promise.all([
      sb
        .from('license_credentials')
        .select(
          'jurisdiction,license_number,license_class,regulatory_status,issue_date,expiration_date,source_dataset,source_observed_at'
        )
        .eq('entity_id', entity.id)
        .limit(CREDENTIAL_CAP),
      sb
        .from('loa_observations')
        .select('official_text,official_code,source_dataset')
        .eq('entity_id', entity.id)
        .limit(LOA_CAP),
      sb
        .from('national_relationships')
        .select('to_entity_id,relationship_type,status,source_dataset')
        .eq('from_entity_id', entity.id)
        .limit(APPOINTMENT_CAP),
      sb
        .from('contact_observations')
        .select('contact_kind,value,source_dataset,public_eligible')
        .eq('entity_id', entity.id)
        .eq('public_eligible', true)
        .limit(CONTACT_CAP),
      sb
        .from('cms_marketplace_observations')
        .select('evidence_type,plan_year,source_dataset')
        .eq('entity_id', entity.id)
        .limit(CMS_CAP),
      sb
        .from('regulatory_evidence')
        .select('entity_id,attribution_confidence,source_dataset,event_date,category,is_final')
        .eq('entity_id', entity.id)
        .limit(20),
    ]);

    const credentials = (credRes.data || []).map((c) => ({
      jurisdiction: String(c.jurisdiction || ''),
      licenseNumber: String(c.license_number || ''),
      licenseClass: c.license_class ? String(c.license_class) : null,
      regulatoryStatus: c.regulatory_status ? String(c.regulatory_status) : null,
      issueDate: c.issue_date ? String(c.issue_date) : null,
      expirationDate: c.expiration_date ? String(c.expiration_date) : null,
      sourceDataset: String(c.source_dataset || ''),
      sourceObservedAt: c.source_observed_at ? String(c.source_observed_at) : null,
    }));
    const loas = (loaRes.data || []).map((l) => ({
      officialText: String(l.official_text || ''),
      officialCode: l.official_code ? String(l.official_code) : null,
      sourceDataset: String(l.source_dataset || ''),
    }));
    const appointments = (relRes.data || [])
      .filter((r) => r.relationship_type !== PERSON_APPOINTMENT_TYPE)
      .filter((r) => r.relationship_type !== 'APPOINTER_RESOLVES_TO')
      .filter((r) => r.relationship_type !== 'MEMBER_OF_GROUP')
      .filter((r) => r.relationship_type !== 'USES_BRAND')
      .map((r) => ({
        toEntityId: String(r.to_entity_id),
        relationshipType: String(r.relationship_type),
        status: r.status ? String(r.status) : null,
        sourceDataset: String(r.source_dataset || ''),
        limitation:
          'Appointment is not employment, quality, or service territory.',
      }));
    const contacts = (contactRes.data || []).map((c) => ({
      kind: String(c.contact_kind),
      value: String(c.value),
      sourceDataset: String(c.source_dataset || ''),
      publicEligible: Boolean(c.public_eligible),
    }));
    const cms = (cmsRes.data || []).map((c) => ({
      evidenceType: String(c.evidence_type),
      planYear: c.plan_year ? String(c.plan_year) : null,
      sourceDataset: String(c.source_dataset || ''),
      note: 'CMS Marketplace registration is not a state license.',
    }));

    const sources = [
      ...credentials.map((c) => ({
        authority: 'State insurance regulator',
        dataset: c.sourceDataset,
        asOf: c.sourceObservedAt,
      })),
      ...loas.map((l) => ({
        authority: 'State insurance regulator',
        dataset: l.sourceDataset,
        asOf: null,
      })),
      ...appointments.map((a) => ({
        authority: 'State insurance regulator',
        dataset: a.sourceDataset,
        asOf: null,
      })),
      ...cms.map((c) => ({
        authority: 'CMS',
        dataset: c.sourceDataset,
        asOf: null,
      })),
    ].filter((s, i, arr) => arr.findIndex((x) => x.dataset === s.dataset) === i);

    const readiness = classifyAgencyPublicationReadiness({
      identityConfidence: (entity.identity_confidence as 'CONFIRMED') || 'UNRESOLVED',
      hasNpn: Boolean(entity.npn),
      hasCredential: credentials.length > 0,
      kindCollision: false,
    });

    const candidates = (evRes.data || []).map((e) => ({
      entityId: e.entity_id,
      identityConfidence: e.attribution_confidence,
      publicationReadiness: 'INTERNAL_ONLY',
      family: e.category,
      sourceDataset: e.source_dataset,
      eventDate: e.event_date,
      respondentKind: null,
    }));
    for (const c of candidates) {
      void mayPublishRegulatoryEvidenceRecord(c);
    }

    return buildAgencyTrustReport({
      entity: {
        id: String(entity.id),
        kind: 'agency',
        npn: entity.npn ? String(entity.npn) : null,
        legalName: String(entity.legal_name),
        displayName: String(entity.display_name),
        identityConfidence: String(entity.identity_confidence),
      },
      credentials,
      loas,
      appointments,
      cms,
      contacts,
      regulatoryCandidates: candidates,
      sources,
      readiness,
    });
  } catch {
    return null;
  }
}
