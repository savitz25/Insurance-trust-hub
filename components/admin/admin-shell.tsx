'use client';

import { usePathname } from 'next/navigation';
import { AdminNav } from '@/components/admin/admin-nav';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/admin/login';

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <AdminNav />
      <div className="flex-1 p-6 md:p-8 bg-background">{children}</div>
    </div>
  );
}