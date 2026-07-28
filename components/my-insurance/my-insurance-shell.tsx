'use client';

import { MyInsuranceProvider } from '@/components/my-insurance/my-insurance-provider';
import { AuthModal } from '@/components/my-insurance/auth-modal';
import { CompareTray } from '@/components/my-insurance/compare-tray';
import type { ReactNode } from 'react';

export function MyInsuranceShell({ children }: { children: ReactNode }) {
  return (
    <MyInsuranceProvider>
      {children}
      <AuthModal />
      <CompareTray />
    </MyInsuranceProvider>
  );
}
