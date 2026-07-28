'use client';

import { useEffect, useState } from 'react';
import { GitCompare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  addToCompareTray,
  isInCompareTray,
  removeFromCompareTray,
} from '@/lib/my-insurance/compare-storage';
import { MAX_COMPARE_PROVIDERS } from '@/lib/my-insurance/constants';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Props = {
  providerSlug: string;
  providerName: string;
  className?: string;
  size?: 'default' | 'sm';
};

export function CompareProviderButton({
  providerSlug,
  providerName,
  className,
  size = 'sm',
}: Props) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const sync = () => setActive(isInCompareTray(providerSlug));
    sync();
    window.addEventListener('ith-compare-tray', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('ith-compare-tray', sync);
      window.removeEventListener('storage', sync);
    };
  }, [providerSlug]);

  function toggle() {
    if (active) {
      removeFromCompareTray(providerSlug);
      setActive(false);
      toast.message('Removed from compare');
      return;
    }
    const res = addToCompareTray({ slug: providerSlug, name: providerName });
    if (!res.ok) {
      toast.error(res.reason || `Limit ${MAX_COMPARE_PROVIDERS} agencies`);
      return;
    }
    setActive(true);
    toast.success('Added to compare');
  }

  return (
    <Button
      type="button"
      variant={active ? 'secondary' : 'outline'}
      size={size}
      className={cn('gap-2', className)}
      onClick={toggle}
      aria-pressed={active}
      aria-label={active ? 'Remove from compare' : 'Add to compare'}
    >
      <GitCompare className="h-4 w-4" aria-hidden />
      {active ? 'In compare' : 'Add to compare'}
    </Button>
  );
}
