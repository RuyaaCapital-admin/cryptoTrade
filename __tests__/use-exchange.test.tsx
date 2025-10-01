import React from 'react';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { ExchangeAdapter } from '@/lib/exchanges/types';
import { useExchange } from '@/hooks/use-exchange';
import { __resetExchangeHookCacheForTests } from '@/hooks/use-exchange';
import { useExchangeStore } from '@/lib/stores/exchange-store';
import { useMarketStore } from '@/lib/stores/market-store';

jest.mock('@/lib/exchanges', () => ({
  getExchangeAdapter: jest.fn(),
}));

const { getExchangeAdapter } = jest.requireMock('@/lib/exchanges');

let mockAdapter: ExchangeAdapter;

function createMockAdapter(): ExchangeAdapter {
  let connected = false;

  const wsConnect = jest.fn(async () => {
    connected = true;
  });

  const wsDisconnect = jest.fn(() => {
    connected = false;
  });

  const isConnected = jest.fn(() => connected);

  return {
    name: 'binance',
    wsConnect,
    wsDisconnect,
    subscribe: jest.fn(async () => {}),
    unsubscribe: jest.fn(async () => {}),
    rest: {
      getCandles: jest.fn(),
      getInstruments: jest.fn(),
      getTicker: jest.fn(),
    },
    map: {
      symbolToExchange: jest.fn((value: string) => value),
      symbolFromExchange: jest.fn((value: string) => value),
    },
    onTicker: jest.fn(),
    onOrderBook: jest.fn(),
    onTrade: jest.fn(),
    getMetrics: jest.fn(() => ({
      latency: 0,
      reconnects: 0,
      messagesReceived: 0,
      lastHeartbeat: Date.now(),
    })),
    isConnected,
  };
}

function TestConsumer() {
  useExchange();
  return null;
}

describe('useExchange', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    __resetExchangeHookCacheForTests();

    useExchangeStore.setState({
      selectedExchange: 'binance',
      adapters: new Map(),
      connectionMetrics: new Map(),
      isConnected: false,
    });

    useMarketStore.setState({
      tickers: new Map(),
      orderBooks: new Map(),
      recentTrades: new Map(),
      instruments: [],
      selectedSymbols: new Set(),
    });

    mockAdapter = createMockAdapter();
    getExchangeAdapter.mockReturnValue(mockAdapter);
  });

  afterEach(() => {
    cleanup();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('connects only once for concurrent consumers and disconnects after cleanup', async () => {
    render(
      <>
        <TestConsumer />
        <TestConsumer />
      </>
    );

    await waitFor(() => {
      expect(mockAdapter.wsConnect).toHaveBeenCalledTimes(1);
    });
    expect(mockAdapter.onTicker).toHaveBeenCalledTimes(1);
    expect(mockAdapter.onOrderBook).toHaveBeenCalledTimes(1);
    expect(mockAdapter.onTrade).toHaveBeenCalledTimes(1);

    cleanup();
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockAdapter.wsDisconnect).toHaveBeenCalledTimes(1);
  });

  it('reuses the cached adapter when consumers mount sequentially', async () => {
    const first = render(<TestConsumer />);

    await waitFor(() => {
      expect(mockAdapter.wsConnect).toHaveBeenCalledTimes(1);
    });

    const second = render(<TestConsumer />);

    await waitFor(() => {
      expect(mockAdapter.wsConnect).toHaveBeenCalledTimes(1);
    });

    expect(getExchangeAdapter).toHaveBeenCalledTimes(1);

    second.unmount();
    first.unmount();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockAdapter.wsDisconnect).toHaveBeenCalledTimes(1);
  });
});
