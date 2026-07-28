export type SavedProviderRow = {
  id: string;
  user_id: string;
  provider_slug: string;
  provider_name: string;
  notes: string | null;
  created_at: string;
};

export type PendingSaveProviderAction = {
  type: 'provider';
  payload: {
    providerSlug: string;
    providerName: string;
  };
};

export type PendingSaveAction = PendingSaveProviderAction;

export type GuestSavedProvider = {
  providerSlug: string;
  providerName: string;
  savedAt: string;
};

export type MyInsuranceDashboardData = {
  savedProviders: SavedProviderRow[];
  email: string | null;
};
