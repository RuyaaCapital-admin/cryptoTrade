'use client';

import { useEffect, useRef } from 'react';
import { useExchangeStore } from '@/lib/stores/exchange-store';
import { useMarketStore } from '@/lib/stores/market-store';
import { getExchangeAdapter } from '@/lib/exchanges';
import { ExchangeAdapter } from '@/lib/exchanges/types';

export function useExchange() {
  const { selectedExchange, registerAdapter, setIsConnected, updateMetrics } =
    useExchangeStore();
  const { setTicker, setOrderBook, addTrade } = useMarketStore();
  const adapterRef = useRef<ExchangeAdapter | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;

    async function initializeExchange() {
      try {
        const adapter = getExchangeAdapter(selectedExchange);
        adapterRef.current = adapter;

        adapter.onTicker((ticker) => {
          setTicker(ticker);
        });

        adapter.onOrderBook((orderBook) => {
          setOrderBook(orderBook);
        });

        adapter.onTrade((trade) => {
          addTrade(trade);
        });

        await adapter.wsConnect();
        setIsConnected(true);
        registerAdapter(selectedExchange, adapter);

        const metricsInterval = setInterval(() => {
          if (adapter.isConnected()) {
            updateMetrics(selectedExchange, adapter.getMetrics());
          }
        }, 5000);

        isInitialized.current = true;

        return () => {
          clearInterval(metricsInterval);
          adapter.wsDisconnect();
          setIsConnected(false);
        };
      } catch (error) {
        console.error('Failed to initialize exchange:', error);
        setIsConnected(false);
      }
    }

    initializeExchange();
  }, [selectedExchange, registerAdapter, setIsConnected, updateMetrics, setTicker, setOrderBook, addTrade]);

  return {
    adapter: adapterRef.current,
  };
}
