import { create } from 'zustand';
import { Ticker, OrderBook, Trade, Instrument } from '../exchanges/types';

interface MarketState {
  tickers: Map<string, Ticker>;
  orderBooks: Map<string, OrderBook>;
  recentTrades: Map<string, Trade[]>;
  instruments: Instrument[];
  selectedSymbols: Set<string>;

  setTicker: (ticker: Ticker) => void;
  setOrderBook: (orderBook: OrderBook) => void;
  addTrade: (trade: Trade) => void;
  setInstruments: (instruments: Instrument[]) => void;
  addSelectedSymbol: (symbol: string) => void;
  removeSelectedSymbol: (symbol: string) => void;
  clearSelectedSymbols: () => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  tickers: new Map(),
  orderBooks: new Map(),
  recentTrades: new Map(),
  instruments: [],
  selectedSymbols: new Set(),

  setTicker: (ticker) =>
    set((state) => {
      const newTickers = new Map(state.tickers);
      newTickers.set(ticker.symbol, ticker);
      return { tickers: newTickers };
    }),

  setOrderBook: (orderBook) =>
    set((state) => {
      const newOrderBooks = new Map(state.orderBooks);
      newOrderBooks.set(orderBook.symbol, orderBook);
      return { orderBooks: newOrderBooks };
    }),

  addTrade: (trade) =>
    set((state) => {
      const newRecentTrades = new Map(state.recentTrades);
      const existing = newRecentTrades.get(trade.symbol) || [];
      const updated = [trade, ...existing].slice(0, 100);
      newRecentTrades.set(trade.symbol, updated);
      return { recentTrades: newRecentTrades };
    }),

  setInstruments: (instruments) => set({ instruments }),

  addSelectedSymbol: (symbol) =>
    set((state) => {
      const newSelectedSymbols = new Set(state.selectedSymbols);
      newSelectedSymbols.add(symbol);
      return { selectedSymbols: newSelectedSymbols };
    }),

  removeSelectedSymbol: (symbol) =>
    set((state) => {
      const newSelectedSymbols = new Set(state.selectedSymbols);
      newSelectedSymbols.delete(symbol);
      return { selectedSymbols: newSelectedSymbols };
    }),

  clearSelectedSymbols: () => set({ selectedSymbols: new Set() }),
}));
