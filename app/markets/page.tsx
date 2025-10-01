'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { NeumorphCard } from '@/components/ui/neumorph-card';
import { useExchange } from '@/hooks/use-exchange';
import { useMarketStore } from '@/lib/stores/market-store';
import { useExchangeStore } from '@/lib/stores/exchange-store';
import { Input } from '@/components/ui/input';
import { Search, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MarketsPage() {
  const { adapter } = useExchange();
  const { tickers, instruments, selectedSymbols } = useMarketStore();
  const { selectedExchange, isConnected } = useExchangeStore();
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!adapter || !isConnected) return;

    async function loadInstruments() {
      try {
        const instruments = await adapter!.rest.getInstruments();
        useMarketStore.getState().setInstruments(instruments);

        const topSymbols = instruments.slice(0, 50).map((i) => i.symbol);

        await adapter!.subscribe({
          symbols: topSymbols,
          channels: ['ticker'],
        });
      } catch (error) {
        console.error('Failed to load instruments:', error);
      }
    }

    loadInstruments();
  }, [adapter, isConnected]);

  const tickerArray = Array.from(tickers.values());
  const filteredTickers = tickerArray.filter((ticker) => {
    const matchesSearch = ticker.symbol
      .toLowerCase()
      .includes(search.toLowerCase());
    return matchesSearch;
  });

  const toggleFavorite = (symbol: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      return next;
    });
  };

  const formatNumber = (num: number, decimals = 2) => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const formatVolume = (vol: number) => {
    if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
    if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
    if (vol >= 1e3) return `${(vol / 1e3).toFixed(2)}K`;
    return vol.toFixed(2);
  };

  if (!isConnected) {
    return (
      <div className="flex h-96 items-center justify-center">
        <NeumorphCard className="bg-elevated px-8 py-6">
          <p className="text-text-muted">Connecting to {selectedExchange}...</p>
        </NeumorphCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-text">Markets</h1>
        <div className="w-96">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              type="text"
              placeholder="Search symbols..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <NeumorphCard className="bg-elevated p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface">
                <th className="pb-3 pl-2 text-left text-sm font-medium text-text-muted">

                </th>
                <th className="pb-3 text-left text-sm font-medium text-text-muted">
                  Symbol
                </th>
                <th className="pb-3 text-right text-sm font-medium text-text-muted">
                  Last Price
                </th>
                <th className="pb-3 text-right text-sm font-medium text-text-muted">
                  24h Change
                </th>
                <th className="pb-3 text-right text-sm font-medium text-text-muted">
                  24h Volume
                </th>
                <th className="pb-3 text-right text-sm font-medium text-text-muted">
                  Spread
                </th>
                <th className="pb-3 text-right text-sm font-medium text-text-muted">
                  Exchange
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTickers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-text-muted">
                    {search ? 'No markets found' : 'Loading markets...'}
                  </td>
                </tr>
              ) : (
                filteredTickers.map((ticker) => {
                  const spread = ((ticker.ask - ticker.bid) / ticker.last) * 100;
                  const isPositive = ticker.change24h >= 0;

                  return (
                    <tr
                      key={ticker.symbol}
                      className="group border-b border-surface/50 transition-colors hover:bg-surface/50"
                    >
                      <td className="py-4 pl-2">
                        <button
                          onClick={() => toggleFavorite(ticker.symbol)}
                          className="transition-opacity hover:opacity-100"
                        >
                          <Star
                            className={cn(
                              'h-4 w-4',
                              favorites.has(ticker.symbol)
                                ? 'fill-text text-text'
                                : 'text-text-muted'
                            )}
                          />
                        </button>
                      </td>
                      <td className="py-4">
                        <Link
                          href={`/trade/${encodeURIComponent(ticker.symbol)}`}
                          className="font-medium text-text hover:underline"
                        >
                          {ticker.symbol}
                        </Link>
                      </td>
                      <td className="py-4 text-right font-mono text-text">
                        ${formatNumber(ticker.last)}
                      </td>
                      <td className="py-4 text-right">
                        <span
                          className={cn(
                            'font-medium',
                            isPositive ? 'text-up' : 'text-down'
                          )}
                        >
                          {isPositive ? '+' : ''}
                          {formatNumber(ticker.change24h)}%
                        </span>
                      </td>
                      <td className="py-4 text-right font-mono text-text">
                        ${formatVolume(ticker.volume24h)}
                      </td>
                      <td className="py-4 text-right font-mono text-text-muted">
                        {formatNumber(spread, 3)}%
                      </td>
                      <td className="py-4 text-right text-sm text-text-muted">
                        {selectedExchange}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </NeumorphCard>
    </div>
  );
}
