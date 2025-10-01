import { create } from 'zustand';

type CloseReason = 'manual' | 'stop' | 'take-profit';

interface Position {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  pnlPercent: number;
  realizedPnl: number;
  isPaper: boolean;
  openedAt: number;
  leverage: number;
  stopLoss?: number;
  takeProfit?: number;
}

interface ClosedPosition {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  realizedPnl: number;
  openedAt: number;
  closedAt: number;
  isPaper: boolean;
  leverage: number;
  stopLoss?: number;
  takeProfit?: number;
  closeReason: CloseReason;
}

interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  quantity: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  leverage?: number;
  status: 'pending' | 'filled' | 'cancelled';
  filledQuantity: number;
  averageFillPrice: number;
  isPaper: boolean;
  createdAt: number;
  filledAt?: number;
}

interface TradingState {
  positions: Position[];
  closedPositions: ClosedPosition[];
  orders: Order[];
  isPaperMode: boolean;
  liveTradingEnabled: boolean;

  addPosition: (position: Position) => void;
  updatePosition: (id: string, updates: Partial<Position>) => void;
  closePosition: (id: string, exitPrice: number, reason?: CloseReason) => void;

  addClosedPosition: (position: ClosedPosition) => void;

  addOrder: (order: Order) => void;
  updateOrder: (id: string, updates: Partial<Order>) => void;
  cancelOrder: (id: string) => void;

  processPaperTick: (symbol: string, price: number) => void;

  setPaperMode: (isPaper: boolean) => void;
  setLiveTradingEnabled: (enabled: boolean) => void;

  setPositions: (positions: Position[]) => void;
  setOrders: (orders: Order[]) => void;
  setClosedPositions: (positions: ClosedPosition[]) => void;
}

const initialState = {
  positions: [] as Position[],
  closedPositions: [] as ClosedPosition[],
  orders: [] as Order[],
  isPaperMode: true,
  liveTradingEnabled: false,
};

export const useTradingStore = create<TradingState>((set, get) => ({
  positions: [],
  closedPositions: [],
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

  closePosition: (id, exitPrice, reason = 'manual') =>
    set((state) => {
      const existing = state.positions.find((pos) => pos.id === id);
      if (!existing) {
        return {};
      }

      const pnl =
        existing.side === 'long'
          ? (exitPrice - existing.entryPrice) * existing.quantity
          : (existing.entryPrice - exitPrice) * existing.quantity;

      const closed: ClosedPosition = {
        id: existing.id,
        symbol: existing.symbol,
        side: existing.side,
        quantity: existing.quantity,
        entryPrice: existing.entryPrice,
        exitPrice,
        realizedPnl: existing.realizedPnl + pnl,
        openedAt: existing.openedAt,
        closedAt: Date.now(),
        isPaper: existing.isPaper,
        leverage: existing.leverage,
        stopLoss: existing.stopLoss,
        takeProfit: existing.takeProfit,
        closeReason: reason,
      };

      return {
        positions: state.positions.filter((pos) => pos.id !== id),
        closedPositions: [...state.closedPositions, closed],
      };
    }),

  addClosedPosition: (position) =>
    set((state) => ({
      closedPositions: [...state.closedPositions, position],
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

  processPaperTick: (symbol, price) => {
    const state = get();
    const now = Date.now();

    const updatedOrders = state.orders.map((order) => {
      if (order.symbol !== symbol || order.status !== 'pending') {
        return order;
      }

      const limitPrice = order.price ?? price;
      const shouldFill =
        order.type === 'market' ||
        (order.side === 'buy' ? price <= limitPrice : price >= limitPrice);

      if (!shouldFill) {
        return order;
      }

      const fillPrice = order.type === 'market' ? price : limitPrice;
      const positionSide = order.side === 'buy' ? 'long' : 'short';

      set((current) => {
        const nextPositions = current.positions.map((pos) => ({ ...pos }));
        const posIndex = nextPositions.findIndex(
          (pos) =>
            pos.symbol === symbol &&
            pos.side === positionSide &&
            pos.isPaper === order.isPaper
        );

        if (posIndex === -1) {
          nextPositions.push({
            id: `${symbol}-${positionSide}-${order.isPaper ? 'paper' : 'live'}`,
            symbol,
            side: positionSide,
            quantity: order.quantity,
            entryPrice: fillPrice,
            currentPrice: price,
            unrealizedPnl: 0,
            pnlPercent: 0,
            realizedPnl: 0,
            isPaper: order.isPaper,
            openedAt: now,
            leverage: order.leverage ?? 1,
            stopLoss: order.stopLoss,
            takeProfit: order.takeProfit,
          });
        } else {
          const existing = nextPositions[posIndex];
          const totalQty = existing.quantity + order.quantity;
          const newEntry =
            totalQty === 0
              ? existing.entryPrice
              :
                (existing.entryPrice * existing.quantity + fillPrice * order.quantity) /
                totalQty;

          nextPositions[posIndex] = {
            ...existing,
            quantity: totalQty,
            entryPrice: newEntry,
            stopLoss:
              order.stopLoss !== undefined ? order.stopLoss : existing.stopLoss,
            takeProfit:
              order.takeProfit !== undefined
                ? order.takeProfit
                : existing.takeProfit,
            leverage: order.leverage ?? existing.leverage,
            openedAt: Math.min(existing.openedAt, now),
          };
        }

        return {
          positions: nextPositions,
        };
      });

      return {
        ...order,
        status: 'filled' as const,
        filledQuantity: order.quantity,
        averageFillPrice: fillPrice,
        filledAt: now,
      };
    });

    const positionsAfterFill = get().positions.map((pos) => {
      if (pos.symbol !== symbol) {
        return pos;
      }

      const pnl =
        pos.side === 'long'
          ? (price - pos.entryPrice) * pos.quantity
          : (pos.entryPrice - price) * pos.quantity;
      const entryValue = pos.entryPrice * pos.quantity;
      const pnlPercent = entryValue === 0 ? 0 : (pnl / entryValue) * 100;

      return {
        ...pos,
        currentPrice: price,
        unrealizedPnl: pnl,
        pnlPercent,
      };
    });

    const { positions: finalPositions, closed } = positionsAfterFill.reduce(
      (acc, pos) => {
        if (pos.symbol !== symbol) {
          acc.positions.push(pos);
          return acc;
        }

        let shouldClose = false;
        let reason: CloseReason = 'manual';

        if (pos.stopLoss !== undefined) {
          if (
            (pos.side === 'long' && price <= pos.stopLoss) ||
            (pos.side === 'short' && price >= pos.stopLoss)
          ) {
            shouldClose = true;
            reason = 'stop';
          }
        }

        if (!shouldClose && pos.takeProfit !== undefined) {
          if (
            (pos.side === 'long' && price >= pos.takeProfit) ||
            (pos.side === 'short' && price <= pos.takeProfit)
          ) {
            shouldClose = true;
            reason = 'take-profit';
          }
        }

        if (shouldClose) {
          const realized =
            pos.side === 'long'
              ? (price - pos.entryPrice) * pos.quantity
              : (pos.entryPrice - price) * pos.quantity;

          acc.closed.push({
            id: pos.id,
            symbol: pos.symbol,
            side: pos.side,
            quantity: pos.quantity,
            entryPrice: pos.entryPrice,
            exitPrice: price,
            realizedPnl: pos.realizedPnl + realized,
            openedAt: pos.openedAt,
            closedAt: now,
            isPaper: pos.isPaper,
            leverage: pos.leverage,
            stopLoss: pos.stopLoss,
            takeProfit: pos.takeProfit,
            closeReason: reason,
          });
        } else {
          acc.positions.push(pos);
        }

        return acc;
      },
      { positions: [] as Position[], closed: [] as ClosedPosition[] }
    );

    if (closed.length > 0) {
      set((state) => ({
        closedPositions: [...state.closedPositions, ...closed],
      }));
    }

    set({
      orders: updatedOrders,
      positions: finalPositions,
    });
  },

  setPaperMode: (isPaper) => set({ isPaperMode: isPaper }),

  setLiveTradingEnabled: (enabled) => set({ liveTradingEnabled: enabled }),

  setPositions: (positions) => set({ positions }),

  setOrders: (orders) => set({ orders }),

  setClosedPositions: (positions) => set({ closedPositions: positions }),
}));

export { initialState };
export type { Position, Order, ClosedPosition, CloseReason };
