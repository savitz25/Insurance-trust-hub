/**
 * In-memory national identity + credential graph.
 * CONFIRMED NPN joins only. Missing NPN → provisional, never name/address merge.
 */

import { compareLegalNames } from './names';
import { normalizeNpn } from './npn';
import { mapSourceStatus } from './freshness';
import { consumerGroupFromOfficialLoa } from './loa';
import { resolveLicenseNamespace } from './credential-namespace';
import type { LicenseNamespace } from './credential-namespace';
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

function namespaceOf(input: SourceCredentialInput): LicenseNamespace {
  if (input.licenseNamespace) return input.licenseNamespace;
  return resolveLicenseNamespace({
    licenseClass: input.licenseClass,
    licenseTypes: input.licenseTypes,
    linesOfAuthority: input.loas?.map((l) => l.officialText),
    licenseNumber: input.licenseNumber,
  });
}

function provisionalKey(
  input: SourceCredentialInput,
  ns: LicenseNamespace,
  jurisdiction: string,
  licenseNumber: string
): string {
  return [
    input.sourceDataset,
    jurisdiction,
    input.entityKind,
    ns,
    licenseNumber,
  ].join(':');
}

/** Clear source identity: real entity described; national NPN may still be missing. */
export function sourceIdentityIsClear(input: SourceCredentialInput): boolean {
  const lic = normLicense(input.licenseNumber);
  const name = (input.legalName || input.displayName || '').trim();
  const jur = normJurisdiction(input.jurisdiction);
  return Boolean(lic && name && input.entityKind && jur.length === 2);
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
    const ns = namespaceOf(input);
    const npn = normalizeNpn(input.npn ?? null);
    const ingestedAt = input.ingestedAt || this.nowIso;
    const sourceObservedAt = input.sourceObservedAt || ingestedAt;

    if (!licenseNumber || !jurisdiction || !input.entityKind) {
      return {
        entity: null,
        credential: this.unattachedStub(input, ns, jurisdiction, licenseNumber, ingestedAt),
        identityConfidence: 'UNRESOLVED',
        createdEntity: false,
        conflict: null,
      };
    }

    const existingCred = this.credentials.find(
      (c) =>
        c.jurisdiction === jurisdiction &&
        c.entityKind === input.entityKind &&
        c.licenseNamespace === ns &&
        c.licenseNumber === licenseNumber
    );

    if (existingCred) {
      return this.reimportExisting(existingCred, input, npn);
    }

    if (!sourceIdentityIsClear(input)) {
      const credential = this.makeCredential({
        input,
        ns,
        jurisdiction,
        licenseNumber,
        entityId: null,
        confidence: 'UNRESOLVED',
        ingestedAt,
        sourceObservedAt,
      });
      this.credentials.push(credential);
      return {
        entity: null,
        credential,
        identityConfidence: 'UNRESOLVED',
        createdEntity: false,
        conflict: null,
      };
    }

    const resolved = this.resolveEntity(input, npn, ns, jurisdiction, licenseNumber);
    const credential = this.makeCredential({
      input,
      ns,
      jurisdiction,
      licenseNumber,
      entityId: resolved.entity?.id ?? null,
      confidence: resolved.confidence,
      ingestedAt,
      sourceObservedAt,
    });
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

  private makeCredential(args: {
    input: SourceCredentialInput;
    ns: LicenseNamespace;
    jurisdiction: string;
    licenseNumber: string;
    entityId: string | null;
    confidence: IdentityConfidence;
    ingestedAt: string;
    sourceObservedAt: string;
  }): LicenseCredential {
    return {
      id: this.next('cred'),
      entityId: args.entityId,
      entityKind: args.input.entityKind,
      jurisdiction: args.jurisdiction,
      regulator: args.input.regulator,
      licenseNumber: args.licenseNumber,
      licenseClass: args.input.licenseClass ?? null,
      licenseNamespace: args.ns,
      regulatoryStatus: mapSourceStatus(args.input.regulatoryStatus),
      issueDate: args.input.issueDate ?? null,
      effectiveDate: args.input.effectiveDate ?? null,
      expirationDate: args.input.expirationDate ?? null,
      renewalDate: null,
      terminationDate: null,
      sourceDataset: args.input.sourceDataset,
      sourceRecordId: args.input.sourceRecordId,
      sourceUrl: args.input.sourceUrl ?? null,
      sourceObservedAt: args.sourceObservedAt,
      ingestedAt: args.ingestedAt,
      attributionConfidence: args.confidence,
    };
  }

  private unattachedStub(
    input: SourceCredentialInput,
    ns: LicenseNamespace,
    jurisdiction: string,
    licenseNumber: string,
    ingestedAt: string
  ): LicenseCredential {
    return {
      id: this.next('cred'),
      entityId: null,
      entityKind: input.entityKind,
      jurisdiction,
      regulator: input.regulator,
      licenseNumber,
      licenseClass: input.licenseClass ?? null,
      licenseNamespace: ns,
      regulatoryStatus: mapSourceStatus(input.regulatoryStatus),
      issueDate: null,
      effectiveDate: null,
      expirationDate: null,
      renewalDate: null,
      terminationDate: null,
      sourceDataset: input.sourceDataset,
      sourceRecordId: input.sourceRecordId,
      sourceUrl: input.sourceUrl ?? null,
      sourceObservedAt: ingestedAt,
      ingestedAt,
      attributionConfidence: 'UNRESOLVED',
    };
  }

  private reimportExisting(
    existingCred: LicenseCredential,
    input: SourceCredentialInput,
    npn: string | null
  ): IngestResult {
    const attached = this.entities.find((e) => e.id === existingCred.entityId) ?? null;

    if (
      npn &&
      attached?.npn &&
      attached.npn !== npn
    ) {
      const conflict = this.addConflict({
        npn,
        entityKind: input.entityKind,
        reason: 'same_license_different_npn',
        leftSourceDataset: existingCred.sourceDataset,
        leftSourceRecordId: existingCred.sourceRecordId,
        leftName: attached.legalName,
        rightSourceDataset: input.sourceDataset,
        rightSourceRecordId: input.sourceRecordId,
        rightName: input.legalName,
        existingEntityId: attached.id,
      });
      return {
        entity: attached,
        credential: existingCred,
        identityConfidence: 'REVIEW_REQUIRED',
        createdEntity: false,
        conflict,
      };
    }

    if (npn && attached?.identityKind === 'provisional') {
      const upgraded = this.upgradeProvisional(attached, npn, input);
      existingCred.entityId = upgraded.entity?.id ?? attached.id;
      existingCred.attributionConfidence = upgraded.confidence;
      if (upgraded.entity) {
        this.attachContacts(upgraded.entity.id, input);
      }
      this.attachLoas(existingCred, input);
      return {
        entity: upgraded.entity,
        credential: existingCred,
        identityConfidence: upgraded.confidence,
        createdEntity: false,
        conflict: upgraded.conflict,
      };
    }

    this.attachContacts(existingCred.entityId, input);
    this.attachLoas(existingCred, input);
    this.maybeBridge(input, existingCred.entityId, existingCred.attributionConfidence);
    return {
      entity: attached,
      credential: existingCred,
      identityConfidence: existingCred.attributionConfidence,
      createdEntity: false,
      conflict: null,
    };
  }

  private upgradeProvisional(
    provisional: NationalEntity,
    npn: string,
    input: SourceCredentialInput
  ): {
    entity: NationalEntity | null;
    confidence: IdentityConfidence;
    conflict: IdentityConflict | null;
  } {
    const nameCmp = compareLegalNames(provisional.legalName, input.legalName);
    if (nameCmp === 'conflict') {
      const conflict = this.addConflict({
        npn,
        entityKind: input.entityKind,
        reason: 'provisional_upgrade_name_conflict',
        leftSourceDataset: null,
        leftSourceRecordId: null,
        leftName: provisional.legalName,
        rightSourceDataset: input.sourceDataset,
        rightSourceRecordId: input.sourceRecordId,
        rightName: input.legalName,
        existingEntityId: provisional.id,
      });
      return { entity: provisional, confidence: 'REVIEW_REQUIRED', conflict };
    }

    const existingNpn = this.findByNpn(provisional.entityKind, npn);
    if (existingNpn && existingNpn.id !== provisional.id) {
      const cmp = compareLegalNames(existingNpn.legalName, input.legalName);
      if (cmp === 'conflict') {
        const conflict = this.addConflict({
          npn,
          entityKind: input.entityKind,
          reason: 'provisional_upgrade_npn_name_conflict',
          leftSourceDataset: null,
          leftSourceRecordId: null,
          leftName: existingNpn.legalName,
          rightSourceDataset: input.sourceDataset,
          rightSourceRecordId: input.sourceRecordId,
          rightName: input.legalName,
          existingEntityId: existingNpn.id,
        });
        return { entity: provisional, confidence: 'REVIEW_REQUIRED', conflict };
      }
      return { entity: existingNpn, confidence: 'CONFIRMED', conflict: null };
    }

    if (input.entityKind !== provisional.entityKind) {
      const conflict = this.addConflict({
        npn,
        entityKind: input.entityKind,
        reason: 'provisional_upgrade_entity_kind_conflict',
        leftSourceDataset: null,
        leftSourceRecordId: null,
        leftName: provisional.legalName,
        rightSourceDataset: input.sourceDataset,
        rightSourceRecordId: input.sourceRecordId,
        rightName: input.legalName,
        existingEntityId: provisional.id,
      });
      return { entity: provisional, confidence: 'REVIEW_REQUIRED', conflict };
    }

    provisional.identityKind = 'npn';
    provisional.npn = npn;
    provisional.identityConfidence = 'CONFIRMED';
    provisional.identityNotes = 'upgraded from provisional with compatible authoritative NPN';
    return { entity: provisional, confidence: 'CONFIRMED', conflict: null };
  }

  private resolveEntity(
    input: SourceCredentialInput,
    npn: string | null,
    ns: LicenseNamespace,
    jurisdiction: string,
    licenseNumber: string
  ): {
    entity: NationalEntity | null;
    confidence: IdentityConfidence;
    created: boolean;
    conflict: IdentityConflict | null;
  } {
    const displayName = input.displayName || input.legalName || 'Unknown';

    if (!npn) {
      const key = provisionalKey(input, ns, jurisdiction, licenseNumber);
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
        identityNotes:
          'provisional: clear source identity, missing NPN; never merged by name/address',
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
