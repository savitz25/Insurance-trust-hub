'use client';

import { useState } from 'react';
import { BookmarkPlus, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  addToolSnapshot,
  getLastSaveError,
} from '@/lib/my-insurance/storage';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Props = {
  toolId: string;
  title: string;
  summary: string;
  href: string;
  payload?: Record<string, unknown>;
  className?: string;
  size?: 'default' | 'sm';
  label?: string;
};

/**
 * Guest-first: save educational tool result onto active CoveragePlan.
 */
export function SaveToolSnapshotButton({
  toolId,
  title,
  summary,
  href,
  payload,
  className,
  size = 'default',
  label = 'Save result to My Insurance',
}: Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    if (saved || saving) return;
    setSaving(true);
    try {
      const snap = addToolSnapshot({ toolId, title, summary, href, payload });
      const err = getLastSaveError();
      if (!snap || err) {
        toast.error(err || 'Could not save on this device');
        return;
      }
      setSaved(true);
      toast.success('Saved to My Insurance', {
        description: 'Tool result on your coverage plan',
        action: {
          label: 'View report',
          onClick: () => {
            window.location.href = '/my-insurance/report';
          },
        },
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={size === 'sm' ? 'sm' : 'default'}
      className={cn(
        'gap-2 border-teal-200 bg-white text-teal-900 hover:bg-teal-50',
        className
      )}
      onClick={handleSave}
      disabled={saving || saved}
    >
      {saving ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : saved ? (
        <Check className="h-4 w-4 text-teal-700" aria-hidden />
      ) : (
        <BookmarkPlus className="h-4 w-4" aria-hidden />
      )}
      {saved ? 'Saved to plan' : label}
    </Button>
  );
}
