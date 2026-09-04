import 'server-only';

import { loadInsuranceNetworkMetrics } from '@/lib/metrics/load-network-metrics';
import { projectHomeIntelFromNetworkMetrics } from '@/lib/metrics/project-home-intel';
import type { InsuranceHomeIntelV1 } from '@/lib/national/home-intel';

export function loadInsuranceHomeIntel(): InsuranceHomeIntelV1 {
  return projectHomeIntelFromNetworkMetrics(loadInsuranceNetworkMetrics());
}
