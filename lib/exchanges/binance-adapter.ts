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

interface BinanceTickerMessage {
  e: string;
  s: string;
  E: number;
  c: string;
  o: string;
  h: string;
  l: string;
  v: string;
  p: string;
  P: string;
  b: string;
  a: string;
}

interface BinanceDepthMessage {
  e: string;
  s: string;
  E: number;
  b: [string, string][];
  a: [string, string][];
}

interface BinanceTradeMessage {
  e: string;
  s: string;
  E: number;
  p: string;
  q: string;
  m: boolean;
  T: number;
}

export class BinanceAdapter implements ExchangeAdapter {
  name = 'binance';
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private subscribedSymbols = new Set<string>();
  private subscribedChannels = new Set<SubscriptionChannel>();
  private isReconnecting = false;

  private tickerCallbacks: ((ticker: Ticker) => void)[] = [];
  private orderBookCallbacks: ((orderBook: OrderBook) => void)[] = [];
  private tradeCallbacks: ((trade: Trade) => void)[] = [];

  private metrics: ConnectionMetrics = {
    latency: 0,
    reconnects: 0,
    messagesReceived: 0,
    lastHeartbeat: Date.now(),
  };

  private readonly BASE_WS_URL = 'wss://stream.binance.com:9443/ws';
  private readonly BASE_REST_URL = 'https://api.binance.com/api/v3';

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
          console.error('Binance WebSocket error:', error);
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

    const streams: string[] = [];
    params.symbols.forEach((symbol) => {
      const binanceSymbol = this.map.symbolToExchange(symbol).toLowerCase();
      params.channels.forEach((channel) => {
        if (channel === 'ticker') {
          streams.push(`${binanceSymbol}@ticker`);
        } else if (channel === 'orderbook') {
          streams.push(`${binanceSymbol}@depth20@100ms`);
        } else if (channel === 'trades') {
          streams.push(`${binanceSymbol}@trade`);
        }
      });
    });

    if (streams.length > 0) {
      this.ws.send(
        JSON.stringify({
          method: 'SUBSCRIBE',
          params: streams,
          id: Date.now(),
        })
      );
    }
  }

  async unsubscribe(params: SubscriptionParams): Promise<void> {
    params.symbols.forEach((sym) => this.subscribedSymbols.delete(sym));

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const streams: string[] = [];
    params.symbols.forEach((symbol) => {
      const binanceSymbol = this.map.symbolToExchange(symbol).toLowerCase();
      params.channels.forEach((channel) => {
        if (channel === 'ticker') {
          streams.push(`${binanceSymbol}@ticker`);
        } else if (channel === 'orderbook') {
          streams.push(`${binanceSymbol}@depth20@100ms`);
        } else if (channel === 'trades') {
          streams.push(`${binanceSymbol}@trade`);
        }
      });
    });

    if (streams.length > 0) {
      this.ws.send(
        JSON.stringify({
          method: 'UNSUBSCRIBE',
          params: streams,
          id: Date.now(),
        })
      );
    }
  }

  rest = {
    getCandles: async (symbol: string, interval: string, limit: number): Promise<Candle[]> => {
      const binanceSymbol = this.map.symbolToExchange(symbol);
      const url = `${this.BASE_REST_URL}/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Binance API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.map((item: any[]) => ({
        timestamp: item[0],
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
        volume: parseFloat(item[5]),
      }));
    },

    getInstruments: async (): Promise<Instrument[]> => {
      const url = `${this.BASE_REST_URL}/exchangeInfo`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Binance API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.symbols
        .filter((s: any) => s.status === 'TRADING')
        .map((s: any) => {
          const lotSize = s.filters.find((f: any) => f.filterType === 'LOT_SIZE');
          const priceFilter = s.filters.find((f: any) => f.filterType === 'PRICE_FILTER');

          return {
            symbol: this.map.symbolFromExchange(s.symbol),
            baseAsset: s.baseAsset,
            quoteAsset: s.quoteAsset,
            type: 'spot' as const,
            minQuantity: parseFloat(lotSize?.minQty || '0'),
            maxQuantity: parseFloat(lotSize?.maxQty || '0'),
            quantityStep: parseFloat(lotSize?.stepSize || '0'),
            minPrice: parseFloat(priceFilter?.minPrice || '0'),
            maxPrice: parseFloat(priceFilter?.maxPrice || '0'),
            priceStep: parseFloat(priceFilter?.tickSize || '0'),
          };
        });
    },

    getTicker: async (symbol: string): Promise<Ticker> => {
      const binanceSymbol = this.map.symbolToExchange(symbol);
      const url = `${this.BASE_REST_URL}/ticker/24hr?symbol=${binanceSymbol}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Binance API error: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        symbol: this.map.symbolFromExchange(data.symbol),
        last: parseFloat(data.lastPrice),
        change24h: parseFloat(data.priceChangePercent),
        volume24h: parseFloat(data.volume),
        high24h: parseFloat(data.highPrice),
        low24h: parseFloat(data.lowPrice),
        bid: parseFloat(data.bidPrice),
        ask: parseFloat(data.askPrice),
        timestamp: data.closeTime,
      };
    },
  };

  map = {
    symbolToExchange: (canonical: string): string => {
      return canonical.replace('-', '');
    },

    symbolFromExchange: (exchange: string): string => {
      const baseQuotePairs = [
        ['USDT', 'USDT'],
        ['BUSD', 'BUSD'],
        ['USD', 'USD'],
        ['BTC', 'BTC'],
        ['ETH', 'ETH'],
      ];

      for (const [quote, sep] of baseQuotePairs) {
        if (exchange.endsWith(quote)) {
          const base = exchange.slice(0, -quote.length);
          return `${base}-${sep}`;
        }
      }
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
      const now = Date.now();

      if (typeof message === 'object' && message !== null && 'E' in message) {
        const eventTime = Number((message as { E: number }).E);
        if (!Number.isNaN(eventTime) && eventTime > 0) {
          this.metrics.latency = Math.max(0, now - eventTime);
        }
      }

      this.metrics.lastHeartbeat = now;

      if (message.e === '24hrTicker') {
        this.handleTickerMessage(message as BinanceTickerMessage);
      } else if (message.e === 'depthUpdate') {
        this.handleDepthMessage(message as BinanceDepthMessage);
      } else if (message.e === 'trade') {
        this.handleTradeMessage(message as BinanceTradeMessage);
      }
    } catch (error) {
      console.error('Error handling Binance message:', error);
    }
  }

  private handleTickerMessage(message: BinanceTickerMessage): void {
    const ticker: Ticker = {
      symbol: this.map.symbolFromExchange(message.s),
      last: parseFloat(message.c),
      change24h: parseFloat(message.P),
      volume24h: parseFloat(message.v),
      high24h: parseFloat(message.h),
      low24h: parseFloat(message.l),
      bid: parseFloat(message.b),
      ask: parseFloat(message.a),
      timestamp: message.E || Date.now(),
    };

    this.tickerCallbacks.forEach((cb) => cb(ticker));
  }

  private handleDepthMessage(message: BinanceDepthMessage): void {
    const orderBook: OrderBook = {
      symbol: this.map.symbolFromExchange(message.s),
      bids: message.b.map(([price, quantity]) => ({
        price: parseFloat(price),
        quantity: parseFloat(quantity),
      })),
      asks: message.a.map(([price, quantity]) => ({
        price: parseFloat(price),
        quantity: parseFloat(quantity),
      })),
      timestamp: message.E || Date.now(),
    };

    this.orderBookCallbacks.forEach((cb) => cb(orderBook));
  }

  private handleTradeMessage(message: BinanceTradeMessage): void {
    const trade: Trade = {
      symbol: this.map.symbolFromExchange(message.s),
      price: parseFloat(message.p),
      quantity: parseFloat(message.q),
      side: message.m ? 'sell' : 'buy',
      timestamp: message.T,
    };

    this.tradeCallbacks.forEach((cb) => cb(trade));
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
