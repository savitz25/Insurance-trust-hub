import type { FlBarRow } from '@/lib/national/fl-state-display';

export function FloridaBars({
  rows,
  caption,
}: {
  rows: FlBarRow[];
  caption: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <figure className="mt-4">
      <figcaption className="sr-only">{caption}</figcaption>
      <ul className="space-y-2.5" aria-label={caption}>
        {rows.map((row) => (
          <li key={row.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-[#1E293B]">{row.label}</span>
              <span className="font-semibold tabular-nums text-[#0A2540]">{row.display}</span>
            </div>
            <div
              className="mt-1 h-2 rounded-full bg-[#E0F2FE]"
              role="presentation"
            >
              <div
                className="h-2 rounded-full bg-[#0284C7]"
                style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </figure>
  );
}
