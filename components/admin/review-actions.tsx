'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Loader2 } from 'lucide-react';
import { moderateReviewAction } from '@/lib/actions/admin';
import { Button } from '@/components/ui/button';

interface ReviewActionsProps {
  reviewId: string;
}

export function ReviewActions({ reviewId }: ReviewActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);

  async function handleAction(status: 'approved' | 'rejected') {
    setLoading(status === 'approved' ? 'approve' : 'reject');
    await moderateReviewAction(reviewId, status);
    router.refresh();
    setLoading(null);
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        className="gap-1 text-trust border-trust/30 hover:bg-trust/10"
        disabled={loading !== null}
        onClick={() => handleAction('approved')}
      >
        {loading === 'approve' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
        disabled={loading !== null}
        onClick={() => handleAction('rejected')}
      >
        {loading === 'reject' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
        Reject
      </Button>
    </div>
  );
}