export interface Ticker {
  symbol: string;
  last: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  bid: number;
  ask: number;
  timestamp: number;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
}

export interface OrderBook {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: number;
}

export interface Trade {
  symbol: string;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
  timestamp: number;
}

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Instrument {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  type: 'spot' | 'perpetual' | 'future';
  minQuantity: number;
  maxQuantity: number;
  quantityStep: number;
  minPrice: number;
  maxPrice: number;
  priceStep: number;
}

export type SubscriptionChannel = 'ticker' | 'orderbook' | 'trades' | 'candles';

export interface SubscriptionParams {
  symbols: string[];
  channels: SubscriptionChannel[];
}

export interface ConnectionMetrics {
  latency: number;
  reconnects: number;
  messagesReceived: number;
  lastHeartbeat: number;
}

export interface ExchangeAdapter {
  name: string;

  wsConnect(): Promise<void>;
  wsDisconnect(): void;
  subscribe(params: SubscriptionParams): Promise<void>;
  unsubscribe(params: SubscriptionParams): Promise<void>;

  rest: {
    getCandles(symbol: string, interval: string, limit: number): Promise<Candle[]>;
    getInstruments(): Promise<Instrument[]>;
    getTicker(symbol: string): Promise<Ticker>;
  };

  map: {
    symbolToExchange(canonical: string): string;
    symbolFromExchange(exchange: string): string;
  };

  onTicker(callback: (ticker: Ticker) => void): void;
  onOrderBook(callback: (orderBook: OrderBook) => void): void;
  onTrade(callback: (trade: Trade) => void): void;

  getMetrics(): ConnectionMetrics;
  isConnected(): boolean;
}
