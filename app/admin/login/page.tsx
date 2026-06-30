import { Suspense } from 'react';
import { AdminLoginForm } from '@/components/admin/login-form';

export default function AdminLoginPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 bg-muted/20">
      <Suspense fallback={<div className="skeleton h-64 w-full max-w-md rounded-xl" />}>
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}