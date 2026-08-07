'use server';

import {
  searchMedicareProviders,
  type ProviderSearchInput,
  type ProviderSearchResult,
} from '@/lib/insurance/cms/provider-search';

export async function runMedicareProviderSearch(
  input: ProviderSearchInput
): Promise<ProviderSearchResult> {
  return searchMedicareProviders({
    npi: input.npi?.trim(),
    lastName: input.lastName?.trim(),
    firstName: input.firstName?.trim(),
    state: input.state?.trim() || 'FL',
    limit: input.limit,
  });
}
