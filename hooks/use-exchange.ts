'use client';

import { useEffect, useState } from 'react';
import { useExchangeStore } from '@/lib/stores/exchange-store';
import { useMarketStore } from '@/lib/stores/market-store';
import { getExchangeAdapter } from '@/lib/exchanges';
import { ExchangeAdapter } from '@/lib/exchanges/types';

type AdapterEntry = {
  adapter: ExchangeAdapter;
  subscribers: number;
  initialized: boolean;
  metricsInterval: NodeJS.Timeout | null;
  connectPromise: Promise<void> | null;
  cleanupTimer: NodeJS.Timeout | null;
};

const adapterCache = new Map<string, AdapterEntry>();

function getOrCreateEntry(exchange: string): AdapterEntry {
  const existing = adapterCache.get(exchange);
  if (existing) {
    if (existing.cleanupTimer) {
      clearTimeout(existing.cleanupTimer);
      existing.cleanupTimer = null;
    }
    return existing;
  }

  const entry: AdapterEntry = {
    adapter: getExchangeAdapter(exchange),
    subscribers: 0,
    initialized: false,
    metricsInterval: null,
    connectPromise: null,
    cleanupTimer: null,
  };

  adapterCache.set(exchange, entry);
  return entry;
}

function cleanupEntry(exchange: string, entry: AdapterEntry) {
  if (entry.metricsInterval) {
    clearInterval(entry.metricsInterval);
    entry.metricsInterval = null;
  }
  entry.adapter.wsDisconnect();
  adapterCache.delete(exchange);
}

function scheduleCleanup(
  exchange: string,
  entry: AdapterEntry,
  onAfterCleanup: () => void
) {
  if (entry.cleanupTimer) {
    return;
  }

  entry.cleanupTimer = setTimeout(() => {
    entry.cleanupTimer = null;
    const latest = adapterCache.get(exchange);
    if (!latest || latest !== entry) {
      return;
    }
    if (latest.subscribers > 0) {
      return;
    }
    cleanupEntry(exchange, entry);
    onAfterCleanup();
  }, 250);
}

export function __resetExchangeHookCacheForTests(): void {
  adapterCache.forEach((entry, exchange) => {
    if (entry.metricsInterval) {
      clearInterval(entry.metricsInterval);
    }
    if (entry.cleanupTimer) {
      clearTimeout(entry.cleanupTimer);
    }
    entry.adapter.wsDisconnect();
    adapterCache.delete(exchange);
  });
}

export function useExchange() {
  const {
    selectedExchange,
    registerAdapter,
    setIsConnected,
    updateMetrics,
  } = useExchangeStore();
  const { setTicker, setOrderBook, addTrade, resetMarketData } =
    useMarketStore();
  const [currentAdapter, setCurrentAdapter] = useState<ExchangeAdapter | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    const entry = getOrCreateEntry(selectedExchange);
    entry.subscribers += 1;
    const { adapter } = entry;

    setCurrentAdapter(adapter);

    if (!entry.initialized) {
      entry.initialized = true;
      resetMarketData();
      setIsConnected(false);
      registerAdapter(selectedExchange, adapter);

      adapter.onTicker((ticker) => {
        if (!cancelled) {
          setTicker(ticker);
        }
      });

      adapter.onOrderBook((orderBook) => {
        if (!cancelled) {
          setOrderBook(orderBook);
        }
      });

      adapter.onTrade((trade) => {
        if (!cancelled) {
          addTrade(trade);
        }
      });
    }

    const ensureMetricsInterval = () => {
      if (entry.metricsInterval) {
        return;
      }

      entry.metricsInterval = setInterval(() => {
        if (!cancelled && adapter.isConnected()) {
          updateMetrics(selectedExchange, adapter.getMetrics());
        }
      }, 5000);
    };

    const handleConnected = () => {
      if (cancelled) return;
      setIsConnected(true);
      updateMetrics(selectedExchange, adapter.getMetrics());
      ensureMetricsInterval();
    };

    async function connect() {
      if (adapter.isConnected()) {
        handleConnected();
        return;
      }

      setIsConnected(false);

      if (!entry.connectPromise) {
        entry.connectPromise = adapter
          .wsConnect()
          .then(() => {
            handleConnected();
          })
          .catch((error) => {
            if (!cancelled) {
              console.error('Failed to initialize exchange:', error);
              setIsConnected(false);
            }
          })
          .finally(() => {
            entry.connectPromise = null;
          });
      }

      try {
        await entry.connectPromise;
      } catch (error) {
        // Errors are handled above; swallow to avoid unhandled rejections.
      }
    }

    connect();

    return () => {
      cancelled = true;
      entry.subscribers = Math.max(0, entry.subscribers - 1);
      setCurrentAdapter((existing) => (existing === adapter ? null : existing));

      if (entry.subscribers === 0) {
        scheduleCleanup(selectedExchange, entry, () => {
          setIsConnected(false);
          resetMarketData();
        });
      }
    };
  }, [
    selectedExchange,
    registerAdapter,
    setIsConnected,
    updateMetrics,
    setTicker,
    setOrderBook,
    addTrade,
    resetMarketData,
  ]);

  return {
    adapter: currentAdapter,
  };
}
