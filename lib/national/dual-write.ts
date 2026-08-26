/**
 * Dual-write foundation: source record → national graph.
 * Does not mutate public.providers. Opt-in; not wired to production promote.
 */

import { NationalGraph } from './graph';
import { mayPromoteToPublicProvider } from './publication';
import type { IngestResult, SourceCredentialInput } from './types';

export type DualWriteResult = IngestResult & {
  publicPublication: { ok: true } | { ok: false; reason: string };
};

export function dualWriteSourceRecord(
  graph: NationalGraph,
  input: SourceCredentialInput
): DualWriteResult {
  const ingested = graph.ingest(input);
  const publicPublication = mayPromoteToPublicProvider({
    entityKind: input.entityKind,
  });
  return { ...ingested, publicPublication };
}
