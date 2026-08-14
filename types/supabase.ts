export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ProviderType = 'independent_agent' | 'brokerage' | 'specialist';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface LicenseEntry {
  state: string;
  license_number: string;
  type: string;
  verification_url: string;
  /** Phase 6B1 provenance */
  source?: string;
  checkedAt?: string;
  method?: 'manual' | 'automated' | 'operator_submitted' | 'seed';
  notes?: string;
  status?: 'verified' | 'pending' | 'unavailable' | 'seed' | 'suppressed';
  identityMatchAccepted?: boolean;
}

export interface LicenseInfo {
  licenses: LicenseEntry[];
  /** Ops audit trail (append-only preferred) */
  audit?: Array<{
    at: string;
    method: string;
    action: string;
    notes?: string;
    license_number?: string;
  }>;
}

export interface ContactAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface ContactInfo {
  phone?: string;
  email?: string;
  website?: string;
  address?: ContactAddress;
  /**
   * Phase 4 — DFS launch geography (structured; preferred over short_description tags).
   * display e.g. "Duval"; normalized e.g. "DUVAL" / "MIAMI-DADE".
   */
  county?: string;
  county_normalized?: string;
  launch_county_id?: string;
  /** Phase 8 — Texas TDI launch market id (houston, dallas, fort_worth, austin, san_antonio) */
  launch_market_id?: string;
  /** NV-1 — resident vs non-resident NV license. Home state is metadata only. */
  residency?: 'resident' | 'non_resident';
  home_address_state?: string;
  /** Phase 6B2 — Google/BBB snapshots nested under contact jsonb */
  enrichment?: import('@/lib/enrichment/types').ProviderEnrichment;
  /**
   * Phase 6A — Florida DFS appointment regulatory snapshot (denormalized for public read).
   * Not an endorsement; never used for ranking.
   */
  appointment_snapshot?: import('@/lib/dfs/appointments').ProviderAppointmentSnapshot;
}

export type Database = {
  public: {
    Tables: {
      providers: {
        Row: {
          id: string;
          slug: string;
          name: string;
          provider_type: ProviderType;
          categories: string[];
          states_licensed: string[];
          cities: string[];
          license_info: LicenseInfo;
          specialties: string[];
          rating: number;
          review_count: number;
          years_in_business: number | null;
          relocation_experience: boolean;
          verified: boolean;
          description: string | null;
          short_description: string | null;
          contact: ContactInfo;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          provider_type: ProviderType;
          categories?: string[];
          states_licensed?: string[];
          cities?: string[];
          license_info?: LicenseInfo;
          specialties?: string[];
          rating?: number;
          review_count?: number;
          years_in_business?: number | null;
          relocation_experience?: boolean;
          verified?: boolean;
          description?: string | null;
          short_description?: string | null;
          contact?: ContactInfo;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          provider_type?: ProviderType;
          categories?: string[];
          states_licensed?: string[];
          cities?: string[];
          license_info?: LicenseInfo;
          specialties?: string[];
          rating?: number;
          review_count?: number;
          years_in_business?: number | null;
          relocation_experience?: boolean;
          verified?: boolean;
          description?: string | null;
          short_description?: string | null;
          contact?: ContactInfo;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          provider_id: string;
          author_name: string;
          author_location: string | null;
          rating: number;
          title: string | null;
          content: string;
          status: ReviewStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          author_name: string;
          author_location?: string | null;
          rating: number;
          title?: string | null;
          content: string;
          status?: ReviewStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          provider_id?: string;
          author_name?: string;
          author_location?: string | null;
          rating?: number;
          title?: string | null;
          content?: string;
          status?: ReviewStatus;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reviews_provider_id_fkey';
            columns: ['provider_id'];
            isOneToOne: false;
            referencedRelation: 'providers';
            referencedColumns: ['id'];
          },
        ];
      };
      leads: {
        Row: {
          id: string;
          provider_id: string | null;
          name: string;
          email: string;
          phone: string | null;
          message: string | null;
          insurance_types: string[];
          destination: string | null;
          source: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          provider_id?: string | null;
          name: string;
          email: string;
          phone?: string | null;
          message?: string | null;
          insurance_types?: string[];
          destination?: string | null;
          source?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          provider_id?: string | null;
          name?: string;
          email?: string;
          phone?: string | null;
          message?: string | null;
          insurance_types?: string[];
          destination?: string | null;
          source?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'leads_provider_id_fkey';
            columns: ['provider_id'];
            isOneToOne: false;
            referencedRelation: 'providers';
            referencedColumns: ['id'];
          },
        ];
      };
      admin_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: 'admin';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: 'admin';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: 'admin';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'admin_profiles_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      insurance_user_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          marketing_opt_in: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          marketing_opt_in?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          marketing_opt_in?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      saved_providers: {
        Row: {
          id: string;
          user_id: string;
          provider_slug: string;
          provider_name: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider_slug: string;
          provider_name: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider_slug?: string;
          provider_name?: string;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      drug_baskets: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      drug_basket_items: {
        Row: {
          id: string;
          basket_id: string;
          name: string;
          strength: string;
          form: string;
          dosage: string;
          quantity: string | null;
          notes: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          basket_id: string;
          name: string;
          strength?: string;
          form?: string;
          dosage?: string;
          quantity?: string | null;
          notes?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          basket_id?: string;
          name?: string;
          strength?: string;
          form?: string;
          dosage?: string;
          quantity?: string | null;
          notes?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      saved_calculator_results: {
        Row: {
          id: string;
          user_id: string;
          calculator_id: string;
          title: string;
          snapshot: Json;
          created_at: string;
          zip?: string | null;
          state?: string | null;
          county?: string | null;
          used_live_marketplace?: boolean | null;
          plan_year?: number | null;
          updated_at?: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          calculator_id: string;
          title: string;
          snapshot?: Json;
          created_at?: string;
          zip?: string | null;
          state?: string | null;
          county?: string | null;
          used_live_marketplace?: boolean | null;
          plan_year?: number | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          calculator_id?: string;
          title?: string;
          snapshot?: Json;
          created_at?: string;
          zip?: string | null;
          state?: string | null;
          county?: string | null;
          used_live_marketplace?: boolean | null;
          plan_year?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      update_provider_rating: {
        Args: {
          p_provider_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      provider_type: ProviderType;
      review_status: ReviewStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Convenience type aliases
export type Provider = Database['public']['Tables']['providers']['Row'];
export type ProviderInsert = Database['public']['Tables']['providers']['Insert'];
export type ProviderUpdate = Database['public']['Tables']['providers']['Update'];

export type Review = Database['public']['Tables']['reviews']['Row'];
export type ReviewInsert = Database['public']['Tables']['reviews']['Insert'];
export type ReviewUpdate = Database['public']['Tables']['reviews']['Update'];

export type Lead = Database['public']['Tables']['leads']['Row'];
export type LeadInsert = Database['public']['Tables']['leads']['Insert'];
export type LeadUpdate = Database['public']['Tables']['leads']['Update'];

export type AdminProfile = Database['public']['Tables']['admin_profiles']['Row'];
export type AdminProfileInsert = Database['public']['Tables']['admin_profiles']['Insert'];
export type AdminProfileUpdate = Database['public']['Tables']['admin_profiles']['Update'];

export type InsuranceCategory =
  | 'homeowners'
  | 'auto'
  | 'health'
  | 'medicare'
  | 'renters';