import { buildInsuranceHomeIntelV1, type InsuranceHomeIntelV1 } from '@/lib/national/home-intel';
import { metricByKey, type InsuranceNetworkMetricsV1 } from './insurance-network-metrics-v1';

function required(value: number | null | undefined): number {
  if (!Number.isSafeInteger(value) || value === null || value === undefined || value < 0) throw new Error('Required homepage count unavailable');
  return value;
}

export function projectHomeIntelFromNetworkMetrics(
  m: InsuranceNetworkMetricsV1
): InsuranceHomeIntelV1 {
  const agencies = required(metricByKey(m, 'insurance_agencies').value);
  const persons = required(metricByKey(m, 'insurance_producer_records').value);
  const legalInsurers = required(metricByKey(m, 'licensed_insurance_companies').value);
  const marketplace = required(metricByKey(m, 'cms_marketplace_evidence_observations').value);
  const credentials = required(metricByKey(m, 'credential_observations').value);
  const directory = required(metricByKey(m, 'public_directory_listings').value);
  const appointingCarriers = required(metricByKey(m, 'appointing_carrier_entities').value);
  return buildInsuranceHomeIntelV1(m.generatedAt, {
    agencies,
    persons,
    legalInsurers,
    credentials,
    agencyCredentials: m.nationalGraph.agencyCredentials,
    marketplace,
    publicDirectoryProviders: directory,
    appointingCarrierEntities: appointingCarriers,
    flCredentialRows: required(m.nationalGraph.credentialsByJurisdiction.FL),
    txCredentialRows: required(m.nationalGraph.credentialsByJurisdiction.TX),
    vtCredentialRows: required(m.nationalGraph.credentialsByJurisdiction.VT),
    maCredentialRows: required(m.nationalGraph.credentialsByJurisdiction.MA),
    ohCredentialRows: required(m.nationalGraph.credentialsByJurisdiction.OH),
    texasLive: true,
    newestDocumentedSourceAsOf: m.newestDocumentedSourceAsOf,
  });
}
