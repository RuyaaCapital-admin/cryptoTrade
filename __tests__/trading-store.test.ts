import { beforeEach, describe, expect, it } from '@jest/globals';
import { useTradingStore, type Order } from '@/lib/stores/trading-store';

const resetStore = () => {
  useTradingStore.setState({
    positions: [],
    closedPositions: [],
    orders: [],
    isPaperMode: true,
    liveTradingEnabled: false,
  });
};

describe('useTradingStore paper trading engine', () => {
  beforeEach(() => {
    resetStore();
  });

  it('fills market orders immediately and opens a long position', () => {
    const order: Order = {
      id: 'order-1',
      symbol: 'BTC-USDT',
      side: 'buy',
      type: 'market',
      quantity: 1,
      status: 'pending',
      filledQuantity: 0,
      averageFillPrice: 0,
      isPaper: true,
      createdAt: Date.now(),
    };

    useTradingStore.getState().addOrder(order);
    useTradingStore.getState().processPaperTick('BTC-USDT', 100_000);

    const state = useTradingStore.getState();
    expect(state.orders[0].status).toBe('filled');
    expect(state.positions).toHaveLength(1);
    expect(state.positions[0].entryPrice).toBe(100_000);
    expect(state.positions[0].side).toBe('long');
  });

  it('respects limit prices before filling orders', () => {
    const order: Order = {
      id: 'order-2',
      symbol: 'ETH-USDT',
      side: 'sell',
      type: 'limit',
      quantity: 2,
      price: 3500,
      status: 'pending',
      filledQuantity: 0,
      averageFillPrice: 0,
      isPaper: true,
      createdAt: Date.now(),
    };

    useTradingStore.getState().addOrder(order);
    useTradingStore.getState().processPaperTick('ETH-USDT', 3400);

    expect(useTradingStore.getState().orders[0].status).toBe('pending');

    useTradingStore.getState().processPaperTick('ETH-USDT', 3600);

    expect(useTradingStore.getState().orders[0].status).toBe('filled');
    expect(useTradingStore.getState().positions[0].side).toBe('short');
  });

  it('automatically closes positions when stop loss is hit', () => {
    const order: Order = {
      id: 'order-3',
      symbol: 'SOL-USDT',
      side: 'buy',
      type: 'market',
      quantity: 10,
      stopLoss: 140,
      status: 'pending',
      filledQuantity: 0,
      averageFillPrice: 0,
      isPaper: true,
      createdAt: Date.now(),
    };

    useTradingStore.getState().addOrder(order);
    useTradingStore.getState().processPaperTick('SOL-USDT', 150);
    expect(useTradingStore.getState().positions).toHaveLength(1);

    useTradingStore.getState().processPaperTick('SOL-USDT', 135);

    const state = useTradingStore.getState();
    expect(state.positions).toHaveLength(0);
    expect(state.closedPositions).toHaveLength(1);
    expect(state.closedPositions[0].closeReason).toBe('stop');
  });
});
