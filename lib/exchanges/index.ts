import { ExchangeAdapter } from './types';
import { BinanceAdapter } from './binance-adapter';
import { CoinbaseAdapter } from './coinbase-adapter';

export * from './types';
export { BinanceAdapter } from './binance-adapter';
export { CoinbaseAdapter } from './coinbase-adapter';

const adapters: Record<string, () => ExchangeAdapter> = {
  binance: () => new BinanceAdapter(),
  coinbase: () => new CoinbaseAdapter(),
};

export function getExchangeAdapter(exchangeName: string): ExchangeAdapter {
  const factory = adapters[exchangeName.toLowerCase()];
  if (!factory) {
    throw new Error(`Exchange adapter not found: ${exchangeName}`);
  }
  return factory();
}

export function getAvailableExchanges(): string[] {
  return Object.keys(adapters);
}
