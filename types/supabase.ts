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
}

export interface LicenseInfo {
  licenses: LicenseEntry[];
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