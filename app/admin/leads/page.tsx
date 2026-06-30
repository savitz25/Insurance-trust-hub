import { format } from 'date-fns';
import { getAdminLeads } from '@/lib/admin/queries';

export default async function AdminLeadsPage() {
  const leads = await getAdminLeads();

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Quote requests and contact referrals
      </p>

      <div className="mt-8 overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Destination</th>
              <th className="px-4 py-3 font-medium">Types</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">{lead.name}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  <div>{lead.email}</div>
                  {lead.phone && <div className="text-xs">{lead.phone}</div>}
                </td>
                <td className="px-4 py-3">{lead.destination ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {lead.insuranceTypes.join(', ') || '—'}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{lead.source ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {format(new Date(lead.createdAt), 'MMM d, yyyy')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}