import manifest from '@/data/home/insurance-network-metrics-v1.json';
import {
  INSURANCE_NETWORK_METRICS_VERSION,
  type InsuranceNetworkMetricsV1,
} from './insurance-network-metrics-v1';

export function loadInsuranceNetworkMetrics(): InsuranceNetworkMetricsV1 {
  const snap = manifest as InsuranceNetworkMetricsV1;
  if (snap.schemaVersion !== INSURANCE_NETWORK_METRICS_VERSION) {
    throw new Error(`Unexpected network metrics version: ${snap.schemaVersion}`);
  }
  if (snap.contractRevision !== "ATH-METRICS-R2-04" || !snap.reconciliation) throw new Error("Missing accepted R2 metric reconciliation");
  return snap;
}
