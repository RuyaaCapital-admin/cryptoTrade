'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { NeumorphCard } from '@/components/ui/neumorph-card';
import { NeumoButton } from '@/components/ui/neumo-button';
import { useExchange } from '@/hooks/use-exchange';
import { useMarketStore } from '@/lib/stores/market-store';
import { useTradingStore } from '@/lib/stores/trading-store';
import { useExchangeStore } from '@/lib/stores/exchange-store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import Decimal from 'decimal.js';

export default function TradePage() {
  const params = useParams();
  const symbol = decodeURIComponent(params.symbol as string);

  const { adapter } = useExchange();
  const { tickers, orderBooks, recentTrades } = useMarketStore();
  const { isPaperMode, liveTradingEnabled, addOrder } = useTradingStore();
  const { isConnected } = useExchangeStore();

  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');

  const ticker = tickers.get(symbol);
  const orderBook = orderBooks.get(symbol);
  const trades = recentTrades.get(symbol) || [];

  useEffect(() => {
    if (!adapter || !isConnected) return;

    adapter.subscribe({
      symbols: [symbol],
      channels: ['ticker', 'orderbook', 'trades'],
    });

    return () => {
      adapter.unsubscribe({
        symbols: [symbol],
        channels: ['ticker', 'orderbook', 'trades'],
      });
    };
  }, [adapter, isConnected, symbol]);

  const handleTrade = (side: 'buy' | 'sell') => {
    if (!quantity || (orderType === 'limit' && !price)) return;

    const order = {
      id: crypto.randomUUID(),
      symbol,
      side,
      type: orderType,
      quantity: parseFloat(quantity),
      price: orderType === 'limit' ? parseFloat(price) : undefined,
      status: 'pending' as const,
      filledQuantity: 0,
      averageFillPrice: 0,
      isPaper: isPaperMode,
      createdAt: Date.now(),
    };

    addOrder(order);
    setQuantity('');
    setPrice('');
  };

  const formatNumber = (num: number, decimals = 2) => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  if (!ticker) {
    return (
      <div className="flex h-96 items-center justify-center">
        <NeumorphCard className="bg-elevated px-8 py-6">
          <p className="text-text-muted">Loading {symbol}...</p>
        </NeumorphCard>
      </div>
    );
  }

  const isPositive = ticker.change24h >= 0;

  return (
    <div className="grid grid-cols-12 gap-5">
      <div className="col-span-8 space-y-5">
        <NeumorphCard className="bg-elevated p-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-text">{symbol}</h1>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-text">
                    ${formatNumber(ticker.last)}
                  </span>
                  <span
                    className={cn(
                      'text-lg font-medium',
                      isPositive ? 'text-up' : 'text-down'
                    )}
                  >
                    {isPositive ? '+' : ''}
                    {formatNumber(ticker.change24h)}%
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6 text-right">
                <div>
                  <div className="text-sm text-text-muted">24h High</div>
                  <div className="font-mono text-text">${formatNumber(ticker.high24h)}</div>
                </div>
                <div>
                  <div className="text-sm text-text-muted">24h Low</div>
                  <div className="font-mono text-text">${formatNumber(ticker.low24h)}</div>
                </div>
                <div>
                  <div className="text-sm text-text-muted">24h Volume</div>
                  <div className="font-mono text-text">${formatNumber(ticker.volume24h, 0)}</div>
                </div>
                <div>
                  <div className="text-sm text-text-muted">Spread</div>
                  <div className="font-mono text-text">
                    ${formatNumber(ticker.ask - ticker.bid, 4)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </NeumorphCard>

        {orderBook && (
          <NeumorphCard className="bg-elevated p-6">
            <h2 className="mb-4 text-lg font-semibold text-text">Order Book</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="mb-2 flex justify-between text-sm text-text-muted">
                  <span>Price (USD)</span>
                  <span>Size</span>
                </div>
                <div className="space-y-1">
                  {orderBook.bids.slice(0, 15).map((bid, i) => (
                    <div
                      key={i}
                      className="flex justify-between font-mono text-sm"
                    >
                      <span className="text-up">${formatNumber(bid.price)}</span>
                      <span className="text-text-muted">{formatNumber(bid.quantity, 4)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 flex justify-between text-sm text-text-muted">
                  <span>Price (USD)</span>
                  <span>Size</span>
                </div>
                <div className="space-y-1">
                  {orderBook.asks.slice(0, 15).map((ask, i) => (
                    <div
                      key={i}
                      className="flex justify-between font-mono text-sm"
                    >
                      <span className="text-down">${formatNumber(ask.price)}</span>
                      <span className="text-text-muted">{formatNumber(ask.quantity, 4)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </NeumorphCard>
        )}
      </div>

      <div className="col-span-4 space-y-5">
        <NeumorphCard className="bg-elevated p-6">
          <Tabs defaultValue="paper" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="paper">Paper</TabsTrigger>
              <TabsTrigger value="live" disabled={!liveTradingEnabled}>
                Live
              </TabsTrigger>
            </TabsList>
            <TabsContent value="paper" className="space-y-4">
              <div className="space-y-2">
                <Label>Order Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <NeumoButton
                    variant={orderType === 'market' ? 'primary' : 'ghost'}
                    onClick={() => setOrderType('market')}
                  >
                    Market
                  </NeumoButton>
                  <NeumoButton
                    variant={orderType === 'limit' ? 'primary' : 'ghost'}
                    onClick={() => setOrderType('limit')}
                  >
                    Limit
                  </NeumoButton>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.0001"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              {orderType === 'limit' && (
                <div className="space-y-2">
                  <Label htmlFor="price">Price (USD)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <NeumoButton
                  variant="primary"
                  onClick={() => handleTrade('buy')}
                  disabled={!quantity}
                  className="bg-up hover:bg-up/90"
                >
                  Buy
                </NeumoButton>
                <NeumoButton
                  variant="danger"
                  onClick={() => handleTrade('sell')}
                  disabled={!quantity}
                >
                  Sell
                </NeumoButton>
              </div>
            </TabsContent>
            <TabsContent value="live">
              <div className="py-8 text-center text-text-muted">
                Live trading requires API keys configured in settings.
              </div>
            </TabsContent>
          </Tabs>
        </NeumorphCard>

        <NeumorphCard className="bg-elevated p-6">
          <h2 className="mb-4 text-lg font-semibold text-text">Recent Trades</h2>
          <div className="space-y-2">
            {trades.slice(0, 20).map((trade, i) => (
              <div
                key={i}
                className="flex justify-between text-sm font-mono"
              >
                <span
                  className={cn(
                    'font-medium',
                    trade.side === 'buy' ? 'text-up' : 'text-down'
                  )}
                >
                  ${formatNumber(trade.price)}
                </span>
                <span className="text-text-muted">{formatNumber(trade.quantity, 4)}</span>
                <span className="text-text-muted">
                  {new Date(trade.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </NeumorphCard>
      </div>
    </div>
  );
}
