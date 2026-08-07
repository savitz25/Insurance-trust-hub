import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { Toaster } from 'sonner';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { AskNetworkBar } from '@/components/network/ask-network-bar';
import { MyInsuranceShell } from '@/components/my-insurance/my-insurance-shell';
import { InsurancePwaProvider } from '@/components/pwa/insurance-pwa-provider';
import { rootLayoutMetadata } from '@/lib/seo/metadata';
import { ASK_NETWORK_STANDARD_VERSION } from '@/lib/network/standard-version';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
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
      >
        {/* network-standard: {ASK_NETWORK_STANDARD_VERSION} */}
        <MyInsuranceShell>
          <AskNetworkBar />
          <Navbar />
          <main className="min-h-[calc(100vh-5rem)] pb-[env(safe-area-inset-bottom)]">
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
