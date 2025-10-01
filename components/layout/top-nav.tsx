'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TrendingUp, User, Settings } from 'lucide-react';
import { NeumorphCard } from '@/components/ui/neumorph-card';
import { cn } from '@/lib/utils';
import { useExchangeStore } from '@/lib/stores/exchange-store';

export function TopNav() {
  const pathname = usePathname();
  const { selectedExchange, isConnected, connectionMetrics } = useExchangeStore();

  const navItems = [
    { href: '/markets', label: 'Markets' },
    { href: '/portfolio', label: 'Portfolio' },
    { href: '/settings', label: 'Settings' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-bg px-6 py-4">
      <NeumorphCard className="flex items-center justify-between bg-elevated px-6 py-3">
        <div className="flex items-center gap-8">
          <Link href="/markets" className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-text" />
            <span className="text-xl font-semibold text-text">CryptoTrade</span>
          </Link>

          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                  pathname.startsWith(item.href)
                    ? 'bg-surface text-text'
                    : 'text-text-muted hover:text-text'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'h-2 w-2 rounded-full',
                isConnected ? 'bg-up' : 'bg-down'
              )}
            />
            <span className="text-sm font-medium text-text-muted">
              {selectedExchange}
            </span>
            {connectionMetrics.get(selectedExchange) && (
              <span className="text-xs text-text-muted">
                {connectionMetrics.get(selectedExchange)!.latency}ms
              </span>
            )}
          </div>

          <button className="rounded-full p-2 hover:bg-surface">
            <User className="h-5 w-5 text-text" />
          </button>
        </div>
      </NeumorphCard>
    </nav>
  );
}
