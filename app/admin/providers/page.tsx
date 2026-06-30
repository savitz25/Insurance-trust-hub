import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getAdminProviders } from '@/lib/admin/queries';
import { DeleteProviderButton } from '@/components/admin/delete-provider-button';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default async function AdminProvidersPage() {
  const providers = await getAdminProviders();

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Providers</h1>
          <p className="mt-1 text-sm text-muted-foreground">{providers.length} listings</p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/admin/providers/new">
            <Plus className="h-4 w-4" /> Add provider
          </Link>
        </Button>
      </div>

      <div className="mt-8 overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Rating</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((p) => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/providers/${p.id}/edit`}
                    className="font-medium hover:text-primary hover:underline"
                  >
                    {p.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{p.slug}</p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {p.city}, {p.state}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {p.rating.toFixed(1)} ({p.reviewCount})
                </td>
                <td className="px-4 py-3">
                  {p.verified ? (
                    <Badge variant="success">Verified</Badge>
                  ) : (
                    <Badge variant="secondary">Unverified</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/providers/${p.id}/edit`}>Edit</Link>
                    </Button>
                    <DeleteProviderButton providerId={p.id} providerName={p.name} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}