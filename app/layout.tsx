import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { Toaster } from 'sonner';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { MyInsuranceShell } from '@/components/my-insurance/my-insurance-shell';
import { HubLastLocationBridge } from '@/components/network/hub-last-location-bridge';
import { InsurancePwaProvider } from '@/components/pwa/insurance-pwa-provider';
import { rootLayoutMetadata } from '@/lib/seo/metadata';
import { ASK_NETWORK_STANDARD_VERSION } from '@/lib/network/standard-version';
import { TH_CHASSIS_VERSION } from '@/lib/design/trusthub-visual-standard';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
  fallback: ['ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
});

export const metadata: Metadata = rootLayoutMetadata;

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0284C7' },
    { media: '(prefers-color-scheme: dark)', color: '#0A2540' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans antialiased pt-[env(safe-area-inset-top)] bg-[#F8FAFC] text-[#1E293B]`}
        data-hub="insurance"
        data-network-standard={ASK_NETWORK_STANDARD_VERSION}
        data-th-chassis={TH_CHASSIS_VERSION}
      >
        {/* network-standard: {ASK_NETWORK_STANDARD_VERSION} */}
        <MyInsuranceShell>
          <HubLastLocationBridge hubId="insurance" />
          <Navbar />
          <main id="main-content" className="min-h-[calc(100vh-5rem)] pb-[env(safe-area-inset-bottom)]">
            {children}
          </main>
          <Footer />
          <InsurancePwaProvider />
          <Toaster position="top-right" richColors closeButton />
          <Analytics />
        </MyInsuranceShell>
      </body>
    </html>
  );
}
