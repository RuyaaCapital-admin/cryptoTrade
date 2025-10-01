import { create } from 'zustand';
import { ExchangeAdapter, ConnectionMetrics } from '../exchanges/types';

interface ExchangeState {
  selectedExchange: string;
  adapters: Map<string, ExchangeAdapter>;
  connectionMetrics: Map<string, ConnectionMetrics>;
  isConnected: boolean;

  setSelectedExchange: (exchange: string) => void;
  registerAdapter: (name: string, adapter: ExchangeAdapter) => void;
  updateMetrics: (exchange: string, metrics: ConnectionMetrics) => void;
  setIsConnected: (connected: boolean) => void;
}

export const useExchangeStore = create<ExchangeState>((set) => ({
  selectedExchange: 'binance',
  adapters: new Map(),
  connectionMetrics: new Map(),
  isConnected: false,

  setSelectedExchange: (exchange) => set({ selectedExchange: exchange }),

  registerAdapter: (name, adapter) =>
    set((state) => {
      const newAdapters = new Map(state.adapters);
      newAdapters.set(name, adapter);
      return { adapters: newAdapters };
    }),

  updateMetrics: (exchange, metrics) =>
    set((state) => {
      const newMetrics = new Map(state.connectionMetrics);
      newMetrics.set(exchange, metrics);
      return { connectionMetrics: newMetrics };
    }),

  setIsConnected: (connected) => set({ isConnected: connected }),
}));
