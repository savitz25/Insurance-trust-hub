import type { HubAgent } from '@/types/agent';

interface HubAgentTableProps {
  agents: HubAgent[];
  hubName: string;
}

export function HubAgentTable({ agents, hubName }: HubAgentTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[720px] text-left text-sm">
        <caption className="sr-only">
          Verified insurance agents in {hubName} — sortable comparison table
        </caption>
        <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-semibold">#</th>
            <th className="px-4 py-3 font-semibold">Agency / Contact</th>
            <th className="px-4 py-3 font-semibold">City & County</th>
            <th className="px-4 py-3 font-semibold">License</th>
            <th className="px-4 py-3 font-semibold">Health Focus</th>
            <th className="px-4 py-3 font-semibold">Rating</th>
            <th className="px-4 py-3 font-semibold">Trust</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {agents.map((agent) => (
            <tr key={agent.id} className="hover:bg-muted/20">
              <td className="px-4 py-3 font-medium text-muted-foreground">{agent.featuredRank}</td>
              <td className="px-4 py-3">
                <div className="font-semibold text-foreground">{agent.name}</div>
                {agent.contactPerson && (
                  <div className="text-xs text-muted-foreground">{agent.contactPerson}</div>
                )}
                {agent.phone && (
                  <div className="text-xs text-muted-foreground">{agent.phone}</div>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {agent.city}, {agent.state}
                {agent.county && <div className="text-xs">{agent.county} County</div>}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{agent.licenseNumber}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {agent.healthFocus.slice(0, 2).map((focus) => (
                    <span
                      key={focus}
                      className="rounded-full bg-trust/10 px-2 py-0.5 text-[10px] font-medium text-trust"
                    >
                      {focus}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className="font-semibold text-amber-700">{agent.rating.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground"> ({agent.reviewCount})</span>
              </td>
              <td className="px-4 py-3 font-medium">{agent.trustScore}/100</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t px-4 py-3 text-[11px] text-muted-foreground">
        ✅ = DFS license confirmed where noted · Verify current status at{' '}
        <a
          href="https://licenseesearch.fldfs.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Florida DFS Licensee Search
        </a>{' '}
        and NIPR/NAIC producer lookup.
      </p>
    </div>
  );
}