import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminProviderById } from '@/lib/admin/queries';
import { ProviderForm } from '@/components/admin/provider-form';
import { Button } from '@/components/ui/button';

interface EditProviderPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProviderPage({ params }: EditProviderPageProps) {
  const { id } = await params;
  const provider = await getAdminProviderById(id);
  if (!provider) notFound();

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit provider</h1>
          <p className="mt-1 text-sm text-muted-foreground">{provider.name}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/providers">Back to list</Link>
        </Button>
      </div>
      <ProviderForm providerId={id} defaultValues={provider} />
    </div>
  );
}