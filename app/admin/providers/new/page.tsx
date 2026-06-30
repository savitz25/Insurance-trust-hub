import Link from 'next/link';
import { ProviderForm } from '@/components/admin/provider-form';
import { Button } from '@/components/ui/button';

export default function NewProviderPage() {
  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add provider</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create a new agency listing</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/providers">Back to list</Link>
        </Button>
      </div>
      <ProviderForm />
    </div>
  );
}