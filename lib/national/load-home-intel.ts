import 'server-only';

import { buildInsuranceHomeIntelV1, type InsuranceHomeIntelV1 } from '@/lib/national/home-intel';

export function loadInsuranceHomeIntel(): InsuranceHomeIntelV1 {
  return buildInsuranceHomeIntelV1();
}
