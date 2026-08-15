import { getLicenseDepartment } from '@/lib/tools/license-verification';
import type { Provider } from '@/types/provider';

export function getProviderLicenseUrl(provider: Provider): string {
  const jurisdiction = (
    provider.license_state ||
    provider.state ||
    ''
  ).toUpperCase();
  const dept = getLicenseDepartment(jurisdiction);
  return dept?.lookupUrl ?? 'https://content.naic.org/consumer.htm';
}