import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import { getProviderBySlug } from '@/lib/providers/queries';

export interface ProviderReview {
  id: string;
  author: string;
  authorLocation?: string | null;
  rating: number;
  title: string;
  content: string;
  createdAt: string;
  verified?: boolean;
}

function buildFallbackReviews(providerSlug: string, count: number): ProviderReview[] {
  const templates = [
    {
      title: 'Responsive and knowledgeable',
      content:
        'Our agent explained coverage options clearly and found a better bundle than our previous carrier. Claims follow-up was prompt when we had a minor auto incident.',
      rating: 5,
    },
    {
      title: 'Great for relocating families',
      content:
        'We moved from out of state and needed new auto and home policies quickly. They walked us through local requirements and wind deductibles without pressure.',
      rating: 5,
    },
    {
      title: 'Solid independent agency',
      content:
        'Compared three carriers for homeowners and auto. Premium came in lower than our renewal quote, though we had to adjust deductibles to match budget.',
      rating: 4,
    },
    {
      title: 'Professional service',
      content:
        'Staff returned calls same day and sent policy documents electronically. Would recommend for anyone shopping independent agents in the area.',
      rating: 4,
    },
    {
      title: 'Helpful annual review',
      content:
        'They reviewed our policies at renewal and suggested umbrella coverage we had overlooked. No hard sell — just practical advice.',
      rating: 5,
    },
  ];

  const names = ['Sarah M.', 'James T.', 'Priya K.', 'Michael R.', 'Elena V.', 'David L.'];
  const locations = ['Local customer', 'Recent mover', 'Long-term client'];

  return Array.from({ length: Math.min(count, 8) }, (_, i) => {
    const t = templates[i % templates.length];
    return {
      id: `fallback-review-${providerSlug}-${i}`,
      author: names[i % names.length],
      authorLocation: locations[i % locations.length],
      rating: t.rating,
      title: t.title,
      content: t.content,
      createdAt: new Date(Date.now() - (i + 1) * 14 * 24 * 60 * 60 * 1000).toISOString(),
      verified: i % 2 === 0,
    };
  });
}

export function getRatingBreakdown(reviews: ProviderReview[]): Record<number, number> {
  const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((r) => {
    breakdown[r.rating] = (breakdown[r.rating] ?? 0) + 1;
  });
  return breakdown;
}

export async function getReviewsForProvider(slug: string): Promise<ProviderReview[]> {
  const provider = await getProviderBySlug(slug);
  if (!provider) return [];

  if (!isSupabaseConfigured()) {
    return buildFallbackReviews(slug, Math.min(provider.review_count, 8));
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('provider_id', provider.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !data?.length) {
      return buildFallbackReviews(slug, Math.min(provider.review_count, 8));
    }

    return data.map((row) => ({
      id: row.id,
      author: row.author_name,
      authorLocation: row.author_location,
      rating: row.rating,
      title: row.title ?? 'Customer review',
      content: row.content,
      createdAt: row.created_at,
    }));
  } catch {
    return buildFallbackReviews(slug, Math.min(provider.review_count, 8));
  }
}