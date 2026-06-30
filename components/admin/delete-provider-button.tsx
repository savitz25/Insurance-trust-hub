'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';
import { deleteProviderAction } from '@/lib/actions/admin';
import { Button } from '@/components/ui/button';

interface DeleteProviderButtonProps {
  providerId: string;
  providerName: string;
}

export function DeleteProviderButton({ providerId, providerName }: DeleteProviderButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${providerName}"? This cannot be undone.`)) return;
    setLoading(true);
    const res = await deleteProviderAction(providerId);
    setLoading(false);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error ?? 'Unable to delete');
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
      onClick={handleDelete}
      disabled={loading}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      Delete
    </Button>
  );
}