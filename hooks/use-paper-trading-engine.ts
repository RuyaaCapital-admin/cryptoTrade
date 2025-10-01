'use client';

import { useEffect } from 'react';
import { useMarketStore } from '@/lib/stores/market-store';
import { useTradingStore } from '@/lib/stores/trading-store';

export function usePaperTradingEngine(symbol: string) {
  const ticker = useMarketStore((state) => state.tickers.get(symbol));
  const processTick = useTradingStore((state) => state.processPaperTick);

  useEffect(() => {
    if (!ticker) {
      return;
    }

    processTick(symbol, ticker.last);
  }, [ticker, processTick, symbol]);
}
