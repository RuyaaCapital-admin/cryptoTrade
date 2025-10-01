'use client';

import { useEffect, useRef } from 'react';
import { useExchangeStore } from '@/lib/stores/exchange-store';
import { useMarketStore } from '@/lib/stores/market-store';
import { getExchangeAdapter } from '@/lib/exchanges';
import { ExchangeAdapter } from '@/lib/exchanges/types';

export function useExchange() {
  const { selectedExchange, registerAdapter, setIsConnected, updateMetrics } =
    useExchangeStore();
  const { setTicker, setOrderBook, addTrade, resetMarketData } =
    useMarketStore();
  const adapterRef = useRef<ExchangeAdapter | null>(null);

  useEffect(() => {
    let cancelled = false;
    let metricsInterval: NodeJS.Timeout | null = null;

    const adapter = getExchangeAdapter(selectedExchange);
    adapterRef.current = adapter;
    resetMarketData();
    setIsConnected(false);

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

    async function connect() {
      try {
        await adapter.wsConnect();
        if (cancelled) {
          return;
        }
        registerAdapter(selectedExchange, adapter);
        setIsConnected(true);
        updateMetrics(selectedExchange, adapter.getMetrics());

        metricsInterval = setInterval(() => {
          if (!cancelled && adapter.isConnected()) {
            updateMetrics(selectedExchange, adapter.getMetrics());
          }
        }, 5000);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to initialize exchange:', error);
          setIsConnected(false);
        }
      }
    }

    connect();

    return () => {
      cancelled = true;
      if (metricsInterval) {
        clearInterval(metricsInterval);
      }
      adapter.wsDisconnect();
      adapterRef.current = null;
      setIsConnected(false);
      resetMarketData();
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
    adapter: adapterRef.current,
  };
}
