import {
  ExchangeAdapter,
  Ticker,
  OrderBook,
  Trade,
  Candle,
  Instrument,
  SubscriptionParams,
  ConnectionMetrics,
  SubscriptionChannel,
} from './types';

interface CoinbaseTickerMessage {
  type: 'ticker';
  product_id: string;
  price: string;
  open_24h: string;
  volume_24h: string;
  low_24h: string;
  high_24h: string;
  best_bid: string;
  best_ask: string;
  time: string;
}

interface CoinbaseSnapshotMessage {
  type: 'snapshot';
  product_id: string;
  bids: [string, string][];
  asks: [string, string][];
}

interface CoinbaseL2UpdateMessage {
  type: 'l2update';
  product_id: string;
  changes: [string, string, string][];
  time: string;
}

interface CoinbaseMatchMessage {
  type: 'match';
  product_id: string;
  price: string;
  size: string;
  side: 'buy' | 'sell';
  time: string;
}

export class CoinbaseAdapter implements ExchangeAdapter {
  name = 'coinbase';
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private subscribedSymbols = new Set<string>();
  private subscribedChannels = new Set<SubscriptionChannel>();
  private isReconnecting = false;
  private orderBooks = new Map<string, OrderBook>();

  private tickerCallbacks: ((ticker: Ticker) => void)[] = [];
  private orderBookCallbacks: ((orderBook: OrderBook) => void)[] = [];
  private tradeCallbacks: ((trade: Trade) => void)[] = [];

  private metrics: ConnectionMetrics = {
    latency: 0,
    reconnects: 0,
    messagesReceived: 0,
    lastHeartbeat: Date.now(),
  };

  private readonly BASE_WS_URL = 'wss://ws-feed.exchange.coinbase.com';
  private readonly BASE_REST_URL = 'https://api.exchange.coinbase.com';

  async wsConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.BASE_WS_URL);

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          this.isReconnecting = false;
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('Coinbase WebSocket error:', error);
          if (this.reconnectAttempts === 0) {
            reject(error);
          }
        };

        this.ws.onclose = () => {
          this.stopHeartbeat();
          if (!this.isReconnecting && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  wsDisconnect(): void {
    this.isReconnecting = false;
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  async subscribe(params: SubscriptionParams): Promise<void> {
    params.symbols.forEach((sym) => this.subscribedSymbols.add(sym));
    params.channels.forEach((ch) => this.subscribedChannels.add(ch));

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const channels: string[] = [];
    if (params.channels.includes('ticker')) {
      channels.push('ticker');
    }
    if (params.channels.includes('orderbook')) {
      channels.push('level2');
    }
    if (params.channels.includes('trades')) {
      channels.push('matches');
    }

    const productIds = params.symbols.map((s) => this.map.symbolToExchange(s));

    if (channels.length > 0 && productIds.length > 0) {
      this.ws.send(
        JSON.stringify({
          type: 'subscribe',
          product_ids: productIds,
          channels: channels,
        })
      );
    }
  }

  async unsubscribe(params: SubscriptionParams): Promise<void> {
    params.symbols.forEach((sym) => this.subscribedSymbols.delete(sym));

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const channels: string[] = [];
    if (params.channels.includes('ticker')) {
      channels.push('ticker');
    }
    if (params.channels.includes('orderbook')) {
      channels.push('level2');
    }
    if (params.channels.includes('trades')) {
      channels.push('matches');
    }

    const productIds = params.symbols.map((s) => this.map.symbolToExchange(s));

    if (channels.length > 0 && productIds.length > 0) {
      this.ws.send(
        JSON.stringify({
          type: 'unsubscribe',
          product_ids: productIds,
          channels: channels,
        })
      );
    }
  }

  rest = {
    getCandles: async (symbol: string, interval: string, limit: number): Promise<Candle[]> => {
      const productId = this.map.symbolToExchange(symbol);
      const granularity = this.mapIntervalToGranularity(interval);
      const end = Math.floor(Date.now() / 1000);
      const start = end - granularity * limit;

      const url = `${this.BASE_REST_URL}/products/${productId}/candles?start=${start}&end=${end}&granularity=${granularity}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Coinbase API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data
        .map((item: number[]) => ({
          timestamp: item[0] * 1000,
          open: item[3],
          high: item[2],
          low: item[1],
          close: item[4],
          volume: item[5],
        }))
        .reverse();
    },

    getInstruments: async (): Promise<Instrument[]> => {
      const url = `${this.BASE_REST_URL}/products`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Coinbase API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data
        .filter((p: any) => p.status === 'online')
        .map((p: any) => ({
          symbol: this.map.symbolFromExchange(p.id),
          baseAsset: p.base_currency,
          quoteAsset: p.quote_currency,
          type: 'spot' as const,
          minQuantity: parseFloat(p.base_min_size || '0'),
          maxQuantity: parseFloat(p.base_max_size || '0'),
          quantityStep: parseFloat(p.base_increment || '0'),
          minPrice: 0,
          maxPrice: 0,
          priceStep: parseFloat(p.quote_increment || '0'),
        }));
    },

    getTicker: async (symbol: string): Promise<Ticker> => {
      const productId = this.map.symbolToExchange(symbol);
      const [tickerData, statsData] = await Promise.all([
        fetch(`${this.BASE_REST_URL}/products/${productId}/ticker`).then((r) => r.json()),
        fetch(`${this.BASE_REST_URL}/products/${productId}/stats`).then((r) => r.json()),
      ]);

      const last = parseFloat(tickerData.price);
      const open = parseFloat(statsData.open);
      const change24h = ((last - open) / open) * 100;

      return {
        symbol: this.map.symbolFromExchange(productId),
        last,
        change24h,
        volume24h: parseFloat(statsData.volume),
        high24h: parseFloat(statsData.high),
        low24h: parseFloat(statsData.low),
        bid: parseFloat(tickerData.bid),
        ask: parseFloat(tickerData.ask),
        timestamp: new Date(tickerData.time).getTime(),
      };
    },
  };

  map = {
    symbolToExchange: (canonical: string): string => {
      return canonical;
    },

    symbolFromExchange: (exchange: string): string => {
      return exchange;
    },
  };

  onTicker(callback: (ticker: Ticker) => void): void {
    this.tickerCallbacks.push(callback);
  }

  onOrderBook(callback: (orderBook: OrderBook) => void): void {
    this.orderBookCallbacks.push(callback);
  }

  onTrade(callback: (trade: Trade) => void): void {
    this.tradeCallbacks.push(callback);
  }

  getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  private handleMessage(data: string): void {
    try {
      this.metrics.messagesReceived++;
      const message = JSON.parse(data);

      if (message.type === 'ticker') {
        this.handleTickerMessage(message as CoinbaseTickerMessage);
      } else if (message.type === 'snapshot') {
        this.handleSnapshotMessage(message as CoinbaseSnapshotMessage);
      } else if (message.type === 'l2update') {
        this.handleL2UpdateMessage(message as CoinbaseL2UpdateMessage);
      } else if (message.type === 'match') {
        this.handleMatchMessage(message as CoinbaseMatchMessage);
      }
    } catch (error) {
      console.error('Error handling Coinbase message:', error);
    }
  }

  private handleTickerMessage(message: CoinbaseTickerMessage): void {
    const last = parseFloat(message.price);
    const open = parseFloat(message.open_24h);
    const change24h = ((last - open) / open) * 100;

    const ticker: Ticker = {
      symbol: this.map.symbolFromExchange(message.product_id),
      last,
      change24h,
      volume24h: parseFloat(message.volume_24h),
      high24h: parseFloat(message.high_24h),
      low24h: parseFloat(message.low_24h),
      bid: parseFloat(message.best_bid),
      ask: parseFloat(message.best_ask),
      timestamp: new Date(message.time).getTime(),
    };

    this.tickerCallbacks.forEach((cb) => cb(ticker));
  }

  private handleSnapshotMessage(message: CoinbaseSnapshotMessage): void {
    const orderBook: OrderBook = {
      symbol: this.map.symbolFromExchange(message.product_id),
      bids: message.bids.map(([price, quantity]) => ({
        price: parseFloat(price),
        quantity: parseFloat(quantity),
      })),
      asks: message.asks.map(([price, quantity]) => ({
        price: parseFloat(price),
        quantity: parseFloat(quantity),
      })),
      timestamp: Date.now(),
    };

    this.orderBooks.set(orderBook.symbol, orderBook);
    this.orderBookCallbacks.forEach((cb) => cb(orderBook));
  }

  private handleL2UpdateMessage(message: CoinbaseL2UpdateMessage): void {
    const symbol = this.map.symbolFromExchange(message.product_id);
    const existingBook = this.orderBooks.get(symbol);

    if (!existingBook) return;

    message.changes.forEach(([side, priceStr, sizeStr]) => {
      const price = parseFloat(priceStr);
      const size = parseFloat(sizeStr);
      const levels = side === 'buy' ? existingBook.bids : existingBook.asks;

      const index = levels.findIndex((l) => l.price === price);
      if (size === 0) {
        if (index !== -1) {
          levels.splice(index, 1);
        }
      } else {
        if (index !== -1) {
          levels[index].quantity = size;
        } else {
          levels.push({ price, quantity: size });
          levels.sort((a, b) => (side === 'buy' ? b.price - a.price : a.price - b.price));
        }
      }
    });

    existingBook.timestamp = new Date(message.time).getTime();
    this.orderBookCallbacks.forEach((cb) => cb(existingBook));
  }

  private handleMatchMessage(message: CoinbaseMatchMessage): void {
    const trade: Trade = {
      symbol: this.map.symbolFromExchange(message.product_id),
      price: parseFloat(message.price),
      quantity: parseFloat(message.size),
      side: message.side,
      timestamp: new Date(message.time).getTime(),
    };

    this.tradeCallbacks.forEach((cb) => cb(trade));
  }

  private mapIntervalToGranularity(interval: string): number {
    const map: Record<string, number> = {
      '1m': 60,
      '5m': 300,
      '15m': 900,
      '1h': 3600,
      '6h': 21600,
      '1d': 86400,
    };
    return map[interval] || 3600;
  }

  private attemptReconnect(): void {
    if (this.isReconnecting) return;

    this.isReconnecting = true;
    this.reconnectAttempts++;
    this.metrics.reconnects++;

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );

    setTimeout(async () => {
      try {
        await this.wsConnect();
        if (this.subscribedSymbols.size > 0) {
          await this.subscribe({
            symbols: Array.from(this.subscribedSymbols),
            channels: Array.from(this.subscribedChannels),
          });
        }
      } catch (error) {
        console.error('Reconnect attempt failed:', error);
      }
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.metrics.lastHeartbeat = Date.now();
      }
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}
