import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { TopNav } from '@/components/layout/top-nav';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CryptoTrade - Real-Time Crypto Trading',
  description: 'Professional crypto trading platform with real-time market data',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TopNav />
        <main className="min-h-screen px-6 py-6">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
