'use client';

import { useEffect } from 'react';
import { NeumorphCard } from '@/components/ui/neumorph-card';
import { useTradingStore } from '@/lib/stores/trading-store';
import { useMarketStore } from '@/lib/stores/market-store';
import { cn } from '@/lib/utils';
import Decimal from 'decimal.js';

export default function PortfolioPage() {
  const { positions } = useTradingStore();
  const { tickers } = useMarketStore();

  const calculatePnL = () => {
    let totalUnrealized = new Decimal(0);
    let totalRealized = new Decimal(0);
    let totalEquity = new Decimal(10000);

    positions.forEach((position) => {
      const ticker = tickers.get(position.symbol);
      if (ticker) {
        const currentPrice = new Decimal(ticker.last);
        const entryPrice = new Decimal(position.entryPrice);
        const quantity = new Decimal(position.quantity);

        const pnl =
          position.side === 'long'
            ? currentPrice.minus(entryPrice).times(quantity)
            : entryPrice.minus(currentPrice).times(quantity);

        totalUnrealized = totalUnrealized.plus(pnl);
      }
      totalRealized = totalRealized.plus(new Decimal(position.realizedPnl));
    });

    return {
      unrealized: totalUnrealized.toNumber(),
      realized: totalRealized.toNumber(),
      total: totalUnrealized.plus(totalRealized).toNumber(),
      equity: totalEquity.plus(totalUnrealized).plus(totalRealized).toNumber(),
    };
  };

  const pnl = calculatePnL();

  const formatNumber = (num: number, decimals = 2) => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-text">Portfolio</h1>

      <div className="grid grid-cols-4 gap-5">
        <NeumorphCard className="bg-elevated p-6">
          <div className="text-sm text-text-muted">Total Equity</div>
          <div className="mt-2 text-2xl font-bold text-text">
            ${formatNumber(pnl.equity)}
          </div>
        </NeumorphCard>

        <NeumorphCard className="bg-elevated p-6">
          <div className="text-sm text-text-muted">Unrealized P&L</div>
          <div
            className={cn(
              'mt-2 text-2xl font-bold',
              pnl.unrealized >= 0 ? 'text-up' : 'text-down'
            )}
          >
            {pnl.unrealized >= 0 ? '+' : ''}${formatNumber(pnl.unrealized)}
          </div>
        </NeumorphCard>

        <NeumorphCard className="bg-elevated p-6">
          <div className="text-sm text-text-muted">Realized P&L</div>
          <div
            className={cn(
              'mt-2 text-2xl font-bold',
              pnl.realized >= 0 ? 'text-up' : 'text-down'
            )}
          >
            {pnl.realized >= 0 ? '+' : ''}${formatNumber(pnl.realized)}
          </div>
        </NeumorphCard>

        <NeumorphCard className="bg-elevated p-6">
          <div className="text-sm text-text-muted">Total P&L</div>
          <div
            className={cn(
              'mt-2 text-2xl font-bold',
              pnl.total >= 0 ? 'text-up' : 'text-down'
            )}
          >
            {pnl.total >= 0 ? '+' : ''}${formatNumber(pnl.total)}
          </div>
        </NeumorphCard>
      </div>

      <NeumorphCard className="bg-elevated p-6">
        <h2 className="mb-4 text-lg font-semibold text-text">Open Positions</h2>
        {positions.length === 0 ? (
          <div className="py-12 text-center text-text-muted">
            No open positions. Start trading to see your portfolio here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface">
                  <th className="pb-3 text-left text-sm font-medium text-text-muted">
                    Symbol
                  </th>
                  <th className="pb-3 text-left text-sm font-medium text-text-muted">
                    Side
                  </th>
                  <th className="pb-3 text-right text-sm font-medium text-text-muted">
                    Quantity
                  </th>
                  <th className="pb-3 text-right text-sm font-medium text-text-muted">
                    Entry Price
                  </th>
                  <th className="pb-3 text-right text-sm font-medium text-text-muted">
                    Current Price
                  </th>
                  <th className="pb-3 text-right text-sm font-medium text-text-muted">
                    Unrealized P&L
                  </th>
                  <th className="pb-3 text-right text-sm font-medium text-text-muted">
                    Type
                  </th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position) => {
                  const ticker = tickers.get(position.symbol);
                  const currentPrice = ticker?.last || position.currentPrice;
                  const pnl =
                    position.side === 'long'
                      ? (currentPrice - position.entryPrice) * position.quantity
                      : (position.entryPrice - currentPrice) * position.quantity;

                  return (
                    <tr
                      key={position.id}
                      className="border-b border-surface/50 hover:bg-surface/50"
                    >
                      <td className="py-4 font-medium text-text">
                        {position.symbol}
                      </td>
                      <td className="py-4">
                        <span
                          className={cn(
                            'rounded px-2 py-1 text-xs font-medium',
                            position.side === 'long'
                              ? 'bg-up/10 text-up'
                              : 'bg-down/10 text-down'
                          )}
                        >
                          {position.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 text-right font-mono text-text">
                        {formatNumber(position.quantity, 4)}
                      </td>
                      <td className="py-4 text-right font-mono text-text">
                        ${formatNumber(position.entryPrice)}
                      </td>
                      <td className="py-4 text-right font-mono text-text">
                        ${formatNumber(currentPrice)}
                      </td>
                      <td className="py-4 text-right font-mono">
                        <span
                          className={cn(
                            'font-medium',
                            pnl >= 0 ? 'text-up' : 'text-down'
                          )}
                        >
                          {pnl >= 0 ? '+' : ''}${formatNumber(pnl)}
                        </span>
                      </td>
                      <td className="py-4 text-right text-sm text-text-muted">
                        {position.isPaper ? 'Paper' : 'Live'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </NeumorphCard>
    </div>
  );
}
