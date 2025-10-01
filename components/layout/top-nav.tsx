'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { TrendingUp, User } from 'lucide-react';
import { NeumorphCard } from '@/components/ui/neumorph-card';
import { cn } from '@/lib/utils';
import { useExchangeStore } from '@/lib/stores/exchange-store';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getAvailableExchanges } from '@/lib/exchanges';

export function TopNav() {
  const pathname = usePathname();
  const {
    selectedExchange,
    isConnected,
    connectionMetrics,
    setSelectedExchange,
  } = useExchangeStore();

  const exchanges = useMemo(() => getAvailableExchanges(), []);
  const connectionInfo = connectionMetrics.get(selectedExchange);

  const navItems = [
    { href: '/markets', label: 'Markets' },
    { href: '/portfolio', label: 'Portfolio' },
    { href: '/settings', label: 'Settings' },
  ];

  const handleExchangeChange = (value: string) => {
    if (value === selectedExchange) return;
    setSelectedExchange(value);
  };

  const formatLabel = (value: string) =>
    value.charAt(0).toUpperCase() + value.slice(1);

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
          <Select value={selectedExchange} onValueChange={handleExchangeChange}>
            <SelectTrigger className="w-[160px] border-none bg-surface px-4 py-2 text-left text-sm font-medium capitalize text-text shadow-none focus:ring-0">
              <SelectValue placeholder="Select exchange" />
            </SelectTrigger>
            <SelectContent className="border-none bg-elevated text-text">
              {exchanges.map((exchange) => (
                <SelectItem
                  key={exchange}
                  value={exchange}
                  className="capitalize text-text"
                >
                  {formatLabel(exchange)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 rounded-md bg-surface px-3 py-1.5">
            <div
              className={cn(
                'h-2 w-2 rounded-full',
                isConnected ? 'bg-up' : 'bg-down'
              )}
            />
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                {isConnected ? 'Live' : 'Connecting'}
              </span>
              {connectionInfo ? (
                <span className="text-xs text-text-muted">
                  {`${Math.max(connectionInfo.latency, 0).toFixed(0)}ms · ${connectionInfo.messagesReceived.toLocaleString()} msgs`}
                </span>
              ) : (
                <span className="text-xs text-text-muted">Awaiting data…</span>
              )}
            </div>
          </div>

          <button className="rounded-full p-2 hover:bg-surface">
            <User className="h-5 w-5 text-text" />
          </button>
        </div>
      </NeumorphCard>
    </nav>
  );
}
