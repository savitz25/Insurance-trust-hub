/**
 * In-memory national identity + credential graph.
 * CONFIRMED NPN joins only. Missing NPN → provisional, never name/address merge.
 */

import { compareLegalNames } from './names';
import { normalizeNpn } from './npn';
import { mapSourceStatus } from './freshness';
import { consumerGroupFromOfficialLoa } from './loa';
import type {
  ContactObservation,
  ContactObservationKind,
  IdentityConfidence,
  IdentityConflict,
  IngestResult,
  LicenseCredential,
  LoaObservation,
  NationalEntity,
  NationalEntityKind,
  ProviderEntityBridge,
  SourceCredentialInput,
} from './types';

function id(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(6, '0')}`;
}

function normLicense(raw: string): string {
  return String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
}

function normJurisdiction(raw: string): string {
  return String(raw || '').trim().toUpperCase().slice(0, 2);
}

function provisionalKey(input: SourceCredentialInput): string {
  return [
    input.sourceDataset,
    normJurisdiction(input.jurisdiction),
    input.entityKind,
    normLicense(input.licenseNumber),
  ].join(':');
}

export class NationalGraph {
  entities: NationalEntity[] = [];
  credentials: LicenseCredential[] = [];
  loas: LoaObservation[] = [];
  contacts: ContactObservation[] = [];
  conflicts: IdentityConflict[] = [];
  bridges: ProviderEntityBridge[] = [];
  private seq = 0;
  private nowIso: string;

  constructor(now?: Date) {
    this.nowIso = (now ?? new Date()).toISOString();
  }

  private next(prefix: string): string {
    this.seq += 1;
    return id(prefix, this.seq);
  }

  findByNpn(kind: NationalEntityKind, npn: string): NationalEntity | undefined {
    return this.entities.find((e) => e.entityKind === kind && e.npn === npn);
  }

  findByProvisional(
    kind: NationalEntityKind,
    key: string
  ): NationalEntity | undefined {
    return this.entities.find(
      (e) => e.entityKind === kind && e.provisionalKey === key
    );
  }

  credentialsForEntity(entityId: string): LicenseCredential[] {
    return this.credentials.filter((c) => c.entityId === entityId);
  }

  jurisdictionsForEntity(entityId: string): string[] {
    return Array.from(
      new Set(this.credentialsForEntity(entityId).map((c) => c.jurisdiction))
    ).sort();
  }

  ingest(input: SourceCredentialInput): IngestResult {
    const jurisdiction = normJurisdiction(input.jurisdiction);
    const licenseNumber = normLicense(input.licenseNumber);
    const npn = normalizeNpn(input.npn ?? null);
    const existingCred = this.credentials.find(
      (c) =>
        c.jurisdiction === jurisdiction &&
        c.entityKind === input.entityKind &&
        c.licenseNumber === licenseNumber
    );

    const ingestedAt = input.ingestedAt || this.nowIso;
    const sourceObservedAt = input.sourceObservedAt || ingestedAt;

    if (existingCred) {
      if (
        npn &&
        existingCred.entityId &&
        this.entities.find((e) => e.id === existingCred.entityId)?.npn &&
        this.entities.find((e) => e.id === existingCred.entityId)?.npn !== npn
      ) {
        const conflict = this.addConflict({
          npn,
          entityKind: input.entityKind,
          reason: 'same_license_different_npn',
          leftSourceDataset: existingCred.sourceDataset,
          leftSourceRecordId: existingCred.sourceRecordId,
          leftName: null,
          rightSourceDataset: input.sourceDataset,
          rightSourceRecordId: input.sourceRecordId,
          rightName: input.legalName,
          existingEntityId: existingCred.entityId,
        });
        return {
          entity: this.entities.find((e) => e.id === existingCred.entityId) ?? null,
          credential: existingCred,
          identityConfidence: 'REVIEW_REQUIRED',
          createdEntity: false,
          conflict,
        };
      }
      this.attachContacts(existingCred.entityId, input);
      this.attachLoas(existingCred, input);
      this.maybeBridge(input, existingCred.entityId, existingCred.attributionConfidence);
      return {
        entity:
          this.entities.find((e) => e.id === existingCred.entityId) ?? null,
        credential: existingCred,
        identityConfidence: existingCred.attributionConfidence,
        createdEntity: false,
        conflict: null,
      };
    }

    const resolved = this.resolveEntity(input, npn);
    const credential: LicenseCredential = {
      id: this.next('cred'),
      entityId: resolved.entity?.id ?? null,
      entityKind: input.entityKind,
      jurisdiction,
      regulator: input.regulator,
      licenseNumber,
      licenseClass: input.licenseClass ?? null,
      licenseNamespace: 'producer',
      regulatoryStatus: mapSourceStatus(input.regulatoryStatus),
      issueDate: input.issueDate ?? null,
      effectiveDate: input.effectiveDate ?? null,
      expirationDate: input.expirationDate ?? null,
      renewalDate: null,
      terminationDate: null,
      sourceDataset: input.sourceDataset,
      sourceRecordId: input.sourceRecordId,
      sourceUrl: input.sourceUrl ?? null,
      sourceObservedAt,
      ingestedAt,
      attributionConfidence: resolved.confidence,
    };
    this.credentials.push(credential);
    this.attachLoas(credential, input);
    if (resolved.entity) {
      this.attachContacts(resolved.entity.id, input);
      this.maybeBridge(input, resolved.entity.id, resolved.confidence);
    }
    return {
      entity: resolved.entity,
      credential,
      identityConfidence: resolved.confidence,
      createdEntity: resolved.created,
      conflict: resolved.conflict,
    };
  }

  private resolveEntity(
    input: SourceCredentialInput,
    npn: string | null
  ): {
    entity: NationalEntity | null;
    confidence: IdentityConfidence;
    created: boolean;
    conflict: IdentityConflict | null;
  } {
    const displayName = input.displayName || input.legalName || 'Unknown';

    if (!npn) {
      const key = provisionalKey(input);
      const existing = this.findByProvisional(input.entityKind, key);
      if (existing) {
        return {
          entity: existing,
          confidence: 'UNRESOLVED',
          created: false,
          conflict: null,
        };
      }
      const entity: NationalEntity = {
        id: this.next('ent'),
        entityKind: input.entityKind,
        identityKind: 'provisional',
        npn: null,
        provisionalKey: key,
        legalName: input.legalName || displayName,
        displayName,
        identityConfidence: 'UNRESOLVED',
        identityNotes: 'provisional: missing or invalid NPN; not merged by name/address',
      };
      this.entities.push(entity);
      return {
        entity,
        confidence: 'UNRESOLVED',
        created: true,
        conflict: null,
      };
    }

    const sameKind = this.findByNpn(input.entityKind, npn);
    if (sameKind) {
      const cmp = compareLegalNames(sameKind.legalName, input.legalName);
      if (cmp === 'conflict') {
        const conflict = this.addConflict({
          npn,
          entityKind: input.entityKind,
          reason: 'same_npn_radically_different_legal_name',
          leftSourceDataset: null,
          leftSourceRecordId: null,
          leftName: sameKind.legalName,
          rightSourceDataset: input.sourceDataset,
          rightSourceRecordId: input.sourceRecordId,
          rightName: input.legalName,
          existingEntityId: sameKind.id,
        });
        return {
          entity: null,
          confidence: 'REVIEW_REQUIRED',
          created: false,
          conflict,
        };
      }
      return {
        entity: sameKind,
        confidence: 'CONFIRMED',
        created: false,
        conflict: null,
      };
    }

    const otherKind = this.entities.find((e) => e.npn === npn && e.entityKind !== input.entityKind);
    if (otherKind) {
      const conflict = this.addConflict({
        npn,
        entityKind: input.entityKind,
        reason: 'same_npn_different_entity_kind',
        leftSourceDataset: null,
        leftSourceRecordId: null,
        leftName: otherKind.legalName,
        rightSourceDataset: input.sourceDataset,
        rightSourceRecordId: input.sourceRecordId,
        rightName: input.legalName,
        existingEntityId: otherKind.id,
      });
      return {
        entity: null,
        confidence: 'REVIEW_REQUIRED',
        created: false,
        conflict,
      };
    }

    const entity: NationalEntity = {
      id: this.next('ent'),
      entityKind: input.entityKind,
      identityKind: 'npn',
      npn,
      provisionalKey: null,
      legalName: input.legalName || displayName,
      displayName,
      identityConfidence: 'CONFIRMED',
      identityNotes: null,
    };
    this.entities.push(entity);
    return {
      entity,
      confidence: 'CONFIRMED',
      created: true,
      conflict: null,
    };
  }

  private addConflict(
    c: Omit<IdentityConflict, 'id' | 'status'>
  ): IdentityConflict {
    const row: IdentityConflict = { ...c, id: this.next('cfl'), status: 'REVIEW_REQUIRED' };
    this.conflicts.push(row);
    return row;
  }

  private attachLoas(credential: LicenseCredential, input: SourceCredentialInput): void {
    for (const loa of input.loas ?? []) {
      const official = loa.officialText.trim();
      if (!official) continue;
      const dup = this.loas.some(
        (x) =>
          x.credentialId === credential.id &&
          x.sourceDataset === input.sourceDataset &&
          x.officialText.toUpperCase() === official.toUpperCase()
      );
      if (dup) continue;
      this.loas.push({
        id: this.next('loa'),
        entityId: credential.entityId,
        credentialId: credential.id,
        officialText: official,
        officialCode: loa.officialCode ?? null,
        loaStatus: loa.loaStatus ?? null,
        effectiveDate: loa.effectiveDate ?? null,
        expirationDate: loa.expirationDate ?? null,
        sourceDataset: input.sourceDataset,
        regulator: input.regulator,
        sourceObservedAt: input.sourceObservedAt || credential.sourceObservedAt,
        consumerGroup: consumerGroupFromOfficialLoa(official),
      });
    }
  }

  private attachContacts(
    entityId: string | null,
    input: SourceCredentialInput
  ): void {
    if (!entityId) return;
    const pairs: Array<[ContactObservationKind, string | null | undefined]> = [
      ['phone', input.phone],
      ['email', input.email],
      ['website', input.website],
      ['physical_address', input.physicalAddress],
      ['mailing_address', input.mailingAddress],
      ['named_contact', input.namedContact],
      ['contact_title', input.contactTitle],
    ];
    const person = input.entityKind === 'person';
    for (const [kind, raw] of pairs) {
      const value = String(raw || '').trim();
      if (!value) continue;
      const dup = this.contacts.some(
        (c) =>
          c.entityId === entityId &&
          c.contactKind === kind &&
          c.sourceDataset === input.sourceDataset &&
          c.value.toUpperCase() === value.toUpperCase()
      );
      if (dup) continue;
      const businessContact = kind === 'email' || kind === 'phone' || kind === 'website';
      this.contacts.push({
        id: this.next('ctc'),
        entityId,
        contactKind: kind,
        value,
        label: null,
        sourceDataset: input.sourceDataset,
        sourceRecordId: input.sourceRecordId,
        sourceObservedAt: input.sourceObservedAt || this.nowIso,
        attributionConfidence: 'CONFIRMED',
        publicEligible: !person && businessContact,
      });
    }
  }

  private maybeBridge(
    input: SourceCredentialInput,
    entityId: string | null,
    confidence: IdentityConfidence
  ): void {
    if (!input.providerId) return;
    if (this.bridges.some((b) => b.providerId === input.providerId)) return;
    this.bridges.push({
      providerId: input.providerId,
      entityId: confidence === 'CONFIRMED' ? entityId : entityId,
      matchMethod: normalizeNpn(input.npn ?? null) ? 'npn' : 'provisional_source_key',
      confidence,
      source: input.sourceDataset,
      matchedAt: this.nowIso,
      notes:
        confidence === 'CONFIRMED'
          ? null
          : 'legacy provider not CONFIRMED to a national NPN entity',
    });
  }

  stats() {
    const multiState = this.entities.filter(
      (e) => this.jurisdictionsForEntity(e.id).length >= 2
    );
    return {
      sourceCredentials: this.credentials.length,
      nationalEntities: this.entities.length,
      persons: this.entities.filter((e) => e.entityKind === 'person').length,
      agencies: this.entities.filter((e) => e.entityKind === 'agency').length,
      carriers: this.entities.filter((e) => e.entityKind === 'carrier').length,
      credentials: this.credentials.length,
      uniqueStates: Array.from(new Set(this.credentials.map((c) => c.jurisdiction))).sort(),
      multiStateEntities: multiState.length,
      provisionalIdentities: this.entities.filter((e) => e.identityKind === 'provisional')
        .length,
      reviewRequiredConflicts: this.conflicts.length,
      unresolvedCredentials: this.credentials.filter(
        (c) => c.attributionConfidence === 'UNRESOLVED' || c.entityId == null
      ).length,
      npnEntities: this.entities.filter((e) => e.identityKind === 'npn').length,
      loaObservations: this.loas.length,
      contactObservations: this.contacts.length,
      providerBridges: this.bridges.length,
    };
  }
}

export function graphEntityProjection(graph: NationalGraph, entityId: string) {
  const entity = graph.entities.find((e) => e.id === entityId) ?? null;
  const credentials = graph.credentialsForEntity(entityId);
  return {
    entity,
    credentials,
    jurisdictions: graph.jurisdictionsForEntity(entityId),
    loas: graph.loas.filter((l) => l.entityId === entityId),
    contacts: graph.contacts.filter((c) => c.entityId === entityId),
  };
}
