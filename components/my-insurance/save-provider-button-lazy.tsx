'use client';

import dynamic from 'next/dynamic';
import type { SaveProviderButtonProps } from '@/components/my-insurance/save-provider-button';

const SaveProviderButton = dynamic(
  () =>
    import('@/components/my-insurance/save-provider-button').then(
      (m) => m.SaveProviderButton
    ),
  {
    ssr: false,
    loading: () => (
      <span className="inline-flex min-h-11 min-w-[4.5rem] items-center justify-center rounded-md border px-3 text-xs text-muted-foreground">
        Save
      </span>
    ),
  }
);

/** Defers My Insurance save JS until after first paint (hub/directory lists). */
export function SaveProviderButtonLazy(props: SaveProviderButtonProps) {
  return <SaveProviderButton {...props} />;
}
