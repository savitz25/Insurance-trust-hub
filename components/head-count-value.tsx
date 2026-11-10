import React from 'react';
import type { HeadCount } from '@/lib/dfs/provider-count';
import {
  exactTotalsSentence,
  formatCountAsOf,
  headCountDisclosure,
  isReadyCount,
} from '@/lib/dfs/provider-count';

export function HeadCountValue({ count }: { count: HeadCount }) {
  if (!isReadyCount(count)) {
    return <span>count temporarily unavailable</span>;
  }
  const note = headCountDisclosure(count);
  return (
    <>
      <span className="tabular-nums">{count.value.toLocaleString()}</span>
      {note ? <span className="ml-2 text-xs font-medium">{note}</span> : null}
    </>
  );
}

export function ExactMatchClause({
  counts,
  until,
}: {
  counts: readonly HeadCount[];
  until?: string;
}) {
  const sentence = exactTotalsSentence(counts);
  if (!sentence) return null;
  return (
    <>
      {sentence.replace(/\.$/, '')}
      {until ? ` ${until}` : ''}.{' '}
    </>
  );
}

export function formatHeadCountAsOf(asOf: number): string {
  return formatCountAsOf(asOf);
}
