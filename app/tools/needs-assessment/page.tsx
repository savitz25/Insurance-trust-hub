import { redirect } from 'next/navigation';

type PageProps = { searchParams?: Promise<{ from?: string }> };

/**
 * Canonical Coverage Compass lives at /tools/coverage-compass.
 * Keep this path as a permanent alias for bookmarks and older links.
 */
export default async function NeedsAssessmentRedirectPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const from = typeof sp.from === 'string' && sp.from ? `?from=${encodeURIComponent(sp.from)}` : '';
  redirect(`/tools/coverage-compass${from}`);
}
