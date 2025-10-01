import { create } from 'zustand';

interface Position {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  isPaper: boolean;
  openedAt: number;
}

interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  quantity: number;
  price?: number;
  status: 'pending' | 'filled' | 'cancelled';
  filledQuantity: number;
  averageFillPrice: number;
  isPaper: boolean;
  createdAt: number;
}

interface TradingState {
  positions: Position[];
  orders: Order[];
  isPaperMode: boolean;
  liveTradingEnabled: boolean;

  addPosition: (position: Position) => void;
  updatePosition: (id: string, updates: Partial<Position>) => void;
  closePosition: (id: string) => void;

  addOrder: (order: Order) => void;
  updateOrder: (id: string, updates: Partial<Order>) => void;
  cancelOrder: (id: string) => void;

  setPaperMode: (isPaper: boolean) => void;
  setLiveTradingEnabled: (enabled: boolean) => void;

  setPositions: (positions: Position[]) => void;
  setOrders: (orders: Order[]) => void;
}

export const useTradingStore = create<TradingState>((set) => ({
  positions: [],
  orders: [],
  isPaperMode: true,
  liveTradingEnabled: false,

  addPosition: (position) =>
    set((state) => ({
      positions: [...state.positions, position],
    })),

  updatePosition: (id, updates) =>
    set((state) => ({
      positions: state.positions.map((pos) =>
        pos.id === id ? { ...pos, ...updates } : pos
      ),
    })),

  closePosition: (id) =>
    set((state) => ({
      positions: state.positions.filter((pos) => pos.id !== id),
    })),

  addOrder: (order) =>
    set((state) => ({
      orders: [...state.orders, order],
    })),

  updateOrder: (id, updates) =>
    set((state) => ({
      orders: state.orders.map((order) =>
        order.id === id ? { ...order, ...updates } : order
      ),
    })),

  cancelOrder: (id) =>
    set((state) => ({
      orders: state.orders.map((order) =>
        order.id === id ? { ...order, status: 'cancelled' as const } : order
      ),
    })),

  setPaperMode: (isPaper) => set({ isPaperMode: isPaper }),

  setLiveTradingEnabled: (enabled) => set({ liveTradingEnabled: enabled }),

  setPositions: (positions) => set({ positions }),

  setOrders: (orders) => set({ orders }),
}));

export type { Position, Order };
