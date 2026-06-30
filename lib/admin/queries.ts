import 'server-only';

import { isSupabaseAdminConfigured } from '@/lib/supabase/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAllFallbackProviders } from '@/lib/providers/queries';
import { dbProviderToForm } from '@/lib/admin/provider-mapper';
import type { ReviewStatus } from '@/types/supabase';

export interface AdminStats {
  providers: number;
  reviewsPending: number;
  leads: number;
  verifiedProviders: number;
}

export interface AdminProviderRow {
  id: string;
  slug: string;
  name: string;
  state: string;
  city: string;
  verified: boolean;
  rating: number;
  reviewCount: number;
}

export interface AdminReviewRow {
  id: string;
  providerId: string;
  providerName: string;
  author: string;
  rating: number;
  title: string | null;
  content: string;
  status: ReviewStatus;
  createdAt: string;
}

export interface AdminLeadRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  destination: string | null;
  insuranceTypes: string[];
  source: string | null;
  createdAt: string;
  providerName?: string;
}

export async function getAdminStats(): Promise<AdminStats> {
  if (!isSupabaseAdminConfigured()) {
    const providers = getAllFallbackProviders();
    return {
      providers: providers.length,
      reviewsPending: 3,
      leads: 12,
      verifiedProviders: providers.filter((p) => p.is_verified).length,
    };
  }

  const supabase = createAdminClient();

  const [providersRes, reviewsRes, leadsRes, verifiedRes] = await Promise.all([
    supabase.from('providers').select('id', { count: 'exact', head: true }),
    supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('leads').select('id', { count: 'exact', head: true }),
    supabase.from('providers').select('id', { count: 'exact', head: true }).eq('verified', true),
  ]);

  return {
    providers: providersRes.count ?? 0,
    reviewsPending: reviewsRes.count ?? 0,
    leads: leadsRes.count ?? 0,
    verifiedProviders: verifiedRes.count ?? 0,
  };
}

export async function getAdminProviders(): Promise<AdminProviderRow[]> {
  if (!isSupabaseAdminConfigured()) {
    return getAllFallbackProviders().map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      state: p.state,
      city: p.city,
      verified: p.is_verified,
      rating: p.rating,
      reviewCount: p.review_count,
    }));
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .order('name', { ascending: true });

  if (error || !data) return [];

  return data.map((row) => {
    const form = dbProviderToForm(row);
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      state: form.state,
      city: form.city,
      verified: row.verified,
      rating: Number(row.rating),
      reviewCount: row.review_count,
    };
  });
}

export async function getAdminProviderById(id: string) {
  if (!isSupabaseAdminConfigured()) {
    const provider = getAllFallbackProviders().find((p) => p.id === id);
    if (!provider) return null;
    const { publicProviderToForm } = await import('@/lib/admin/provider-mapper');
    return publicProviderToForm(provider);
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.from('providers').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return dbProviderToForm(data);
}

export async function getAdminReviews(status?: ReviewStatus): Promise<AdminReviewRow[]> {
  if (!isSupabaseAdminConfigured()) {
    const mock: AdminReviewRow[] = [
      {
        id: 'mock-1',
        providerId: 'fallback-1',
        providerName: 'Summit Insurance Group',
        author: 'Alex P.',
        rating: 5,
        title: 'Great experience',
        content: 'Helpful agent during our move to Florida. Compared multiple carriers quickly.',
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'mock-2',
        providerId: 'fallback-2',
        providerName: 'Heritage Insurance Agency',
        author: 'Jordan S.',
        rating: 3,
        title: 'Slow follow-up',
        content: 'Took several days to return calls about home insurance quote.',
        status: 'pending',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
    return status ? mock.filter((r) => r.status === status) : mock;
  }

  const supabase = createAdminClient();
  let query = supabase
    .from('reviews')
    .select('*, providers(name)')
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    providerId: row.provider_id,
    providerName: (row.providers as { name: string } | null)?.name ?? 'Unknown',
    author: row.author_name,
    rating: row.rating,
    title: row.title,
    content: row.content,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function getAdminLeads(): Promise<AdminLeadRow[]> {
  if (!isSupabaseAdminConfigured()) {
    return [
      {
        id: 'lead-1',
        name: 'Maria Gonzalez',
        email: 'maria@example.com',
        phone: '(555) 234-5678',
        destination: 'FL',
        insuranceTypes: ['auto', 'homeowners'],
        source: 'website',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'lead-2',
        name: 'Robert Chen',
        email: 'robert@example.com',
        phone: null,
        destination: 'TX',
        insuranceTypes: ['renters'],
        source: 'provider-profile',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
      },
    ];
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('leads')
    .select('*, providers(name)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    destination: row.destination,
    insuranceTypes: row.insurance_types,
    source: row.source,
    createdAt: row.created_at,
    providerName: (row.providers as { name: string } | null)?.name,
  }));
}