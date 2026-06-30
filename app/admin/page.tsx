import Link from 'next/link';
import { Building2, MessageSquare, Users, BadgeCheck } from 'lucide-react';
import { getAdminStats } from '@/lib/admin/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();

  const cards = [
    { label: 'Total providers', value: stats.providers, icon: Building2, href: '/admin/providers' },
    { label: 'Pending reviews', value: stats.reviewsPending, icon: MessageSquare, href: '/admin/reviews' },
    { label: 'Leads', value: stats.leads, icon: Users, href: '/admin/leads' },
    { label: 'Verified providers', value: stats.verifiedProviders, icon: BadgeCheck, href: '/admin/providers' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Insurance Trust Hub administration</p>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-8">
        {cards.map((card) => (
          <Link key={card.label} href={card.href}>
            <Card className="hover:shadow-trust transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats.providers >= 0 ? card.value : '—'}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/admin/providers/new">Add provider</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/reviews">Moderate reviews</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">View site</Link>
        </Button>
      </div>
    </div>
  );
}