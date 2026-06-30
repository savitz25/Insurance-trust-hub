import { getLicenseDepartment } from '@/lib/tools/license-verification';
import type { Provider } from '@/types/provider';

export function getProviderLicenseUrl(provider: Provider): string {
  const dept = getLicenseDepartment(provider.state);
  return dept?.lookupUrl ?? 'https://content.naic.org/consumer.htm';
}