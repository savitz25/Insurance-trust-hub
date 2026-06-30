'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Building2, MessageSquare, Users, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/providers', label: 'Providers', icon: Building2 },
  { href: '/admin/reviews', label: 'Reviews', icon: MessageSquare },
  { href: '/admin/leads', label: 'Leads', icon: Users },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/admin/api/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <aside className="w-full md:w-56 shrink-0 border-b md:border-b-0 md:border-r bg-muted/20">
      <div className="p-4 md:py-6">
        <p className="text-xs font-bold tracking-widest text-muted-foreground mb-4">ADMIN</p>
        <nav className="flex md:flex-col gap-1 overflow-x-auto">
          {LINKS.map((link) => {
            const active =
              link.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <Button
          variant="ghost"
          size="sm"
          className="mt-4 gap-2 text-muted-foreground w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>
    </aside>
  );
}