import { buildInsuranceHomeIntelV1, type InsuranceHomeIntelV1 } from '@/lib/national/home-intel';
import { metricByKey, type InsuranceNetworkMetricsV1 } from './insurance-network-metrics-v1';

export function projectHomeIntelFromNetworkMetrics(
  m: InsuranceNetworkMetricsV1
): InsuranceHomeIntelV1 {
  const agencies = metricByKey(m, 'insurance_agencies').value ?? 0;
  const persons = metricByKey(m, 'insurance_producer_records').value ?? 0;
  const legalInsurers = metricByKey(m, 'licensed_insurance_companies').value ?? 0;
  const marketplace = metricByKey(m, 'cms_marketplace_evidence_observations').value ?? 0;
  const credentials = metricByKey(m, 'credential_observations').value ?? 0;
  const directory = metricByKey(m, 'public_directory_listings').value ?? 0;
  const appointingCarriers = metricByKey(m, 'appointing_carrier_entities').value ?? 0;
  return buildInsuranceHomeIntelV1(m.generatedAt, {
    agencies,
    persons,
    legalInsurers,
    credentials,
    agencyCredentials: m.nationalGraph.agencyCredentials,
    marketplace,
    publicDirectoryProviders: directory,
    appointingCarrierEntities: appointingCarriers,
    flCredentialRows: m.nationalGraph.credentialsByJurisdiction.FL ?? 0,
    txCredentialRows: m.nationalGraph.credentialsByJurisdiction.TX ?? 0,
    vtCredentialRows: m.nationalGraph.credentialsByJurisdiction.VT ?? 0,
    maCredentialRows: m.nationalGraph.credentialsByJurisdiction.MA ?? 0,
    ohCredentialRows: m.nationalGraph.credentialsByJurisdiction.OH ?? 0,
    texasLive: true,
    newestDocumentedSourceAsOf: m.newestDocumentedSourceAsOf,
  });
}
