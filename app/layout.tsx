import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { Toaster } from 'sonner';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { MyInsuranceShell } from '@/components/my-insurance/my-insurance-shell';
import { rootLayoutMetadata } from '@/lib/seo/metadata';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = rootLayoutMetadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <MyInsuranceShell>
          <Navbar />
          <main className="min-h-[calc(100vh-5rem)]">{children}</main>
          <Footer />
          <Toaster position="top-right" richColors closeButton />
          <Analytics />
        </MyInsuranceShell>
      </body>
    </html>
  );
}