'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { NeumorphCard } from '@/components/ui/neumorph-card';
import { NeumoButton } from '@/components/ui/neumo-button';
import { useExchange } from '@/hooks/use-exchange';
import { usePaperTradingEngine } from '@/hooks/use-paper-trading-engine';
import { useMarketStore } from '@/lib/stores/market-store';
import { useTradingStore, type Order } from '@/lib/stores/trading-store';
import { useExchangeStore } from '@/lib/stores/exchange-store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { CandlestickChart } from '@/components/charts/candlestick-chart';

export default function TradePage() {
  const params = useParams();
  const symbol = decodeURIComponent(params.symbol as string);

  const { adapter } = useExchange();
  const { tickers, orderBooks, recentTrades } = useMarketStore();
  const { isPaperMode, liveTradingEnabled, addOrder, closePosition, orders, positions } =
    useTradingStore((state) => ({
      isPaperMode: state.isPaperMode,
      liveTradingEnabled: state.liveTradingEnabled,
      addOrder: state.addOrder,
      closePosition: state.closePosition,
      orders: state.orders,
      positions: state.positions,
    }));
  const { isConnected } = useExchangeStore();

  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [leverage, setLeverage] = useState('1');

  const ticker = tickers.get(symbol);
  const orderBook = orderBooks.get(symbol);
  const trades = recentTrades.get(symbol) || [];

  usePaperTradingEngine(symbol);

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

  const relevantPositions = positions.filter(
    (position) => position.symbol === symbol && position.isPaper === isPaperMode
  );

  const relevantOrders = orders.filter(
    (order) => order.symbol === symbol && order.isPaper === isPaperMode
  );

  const handleTrade = (side: 'buy' | 'sell') => {
    if (!ticker) return;

    const parsedQuantity = Number(quantity);
    const parsedPrice = Number(price);
    const parsedStop = stopLoss ? Number(stopLoss) : undefined;
    const parsedTake = takeProfit ? Number(takeProfit) : undefined;
    const parsedLeverage = Math.max(1, Number(leverage) || 1);

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      return;
    }

    if (orderType === 'limit' && (!Number.isFinite(parsedPrice) || parsedPrice <= 0)) {
      return;
    }

    const order: Order = {
      id: crypto.randomUUID(),
      symbol,
      side,
      type: orderType,
      quantity: parsedQuantity,
      price: orderType === 'limit' ? parsedPrice : undefined,
      stopLoss: parsedStop,
      takeProfit: parsedTake,
      leverage: parsedLeverage,
      status: 'pending',
      filledQuantity: 0,
      averageFillPrice: 0,
      isPaper: isPaperMode,
      createdAt: Date.now(),
    };

    addOrder(order);
    useTradingStore.getState().processPaperTick(symbol, ticker.last);

    setQuantity('');
    setPrice('');
    setStopLoss('');
    setTakeProfit('');
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

        <NeumorphCard className="bg-elevated p-0">
          <CandlestickChart symbol={symbol} interval="1m" />
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
                <div className="space-y-2">
                  <Label htmlFor="stopLoss">Stop Loss</Label>
                  <Input
                    id="stopLoss"
                    type="number"
                    step="0.01"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="takeProfit">Take Profit</Label>
                  <Input
                    id="takeProfit"
                    type="number"
                    step="0.01"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="leverage">Leverage</Label>
                <Input
                  id="leverage"
                  type="number"
                  min={1}
                  max={100}
                  step="1"
                  value={leverage}
                  onChange={(e) => setLeverage(e.target.value)}
                />
              </div>

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

        <NeumorphCard className="bg-elevated p-6">
          <h2 className="mb-4 text-lg font-semibold text-text">Open Positions</h2>
          {relevantPositions.length === 0 ? (
            <p className="text-sm text-text-muted">No open positions</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface text-left text-text-muted">
                    <th className="pb-2">Side</th>
                    <th className="pb-2 text-right">Qty</th>
                    <th className="pb-2 text-right">Entry</th>
                    <th className="pb-2 text-right">Last</th>
                    <th className="pb-2 text-right">PnL ($)</th>
                    <th className="pb-2 text-right">PnL (%)</th>
                    <th className="pb-2 text-right">SL / TP</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {relevantPositions.map((position) => (
                    <tr key={position.id} className="border-b border-surface/50">
                      <td
                        className={cn(
                          'py-2 font-medium',
                          position.side === 'long' ? 'text-up' : 'text-down'
                        )}
                      >
                        {position.side.toUpperCase()}
                      </td>
                      <td className="py-2 text-right font-mono text-text">
                        {formatNumber(position.quantity, 4)}
                      </td>
                      <td className="py-2 text-right font-mono text-text">
                        ${formatNumber(position.entryPrice)}
                      </td>
                      <td className="py-2 text-right font-mono text-text">
                        ${formatNumber(position.currentPrice)}
                      </td>
                      <td
                        className={cn(
                          'py-2 text-right font-mono',
                          position.unrealizedPnl >= 0 ? 'text-up' : 'text-down'
                        )}
                      >
                        ${formatNumber(position.unrealizedPnl)}
                      </td>
                      <td
                        className={cn(
                          'py-2 text-right font-mono',
                          position.pnlPercent >= 0 ? 'text-up' : 'text-down'
                        )}
                      >
                        {formatNumber(position.pnlPercent)}%
                      </td>
                      <td className="py-2 text-right text-xs text-text-muted">
                        {position.stopLoss ? `SL ${formatNumber(position.stopLoss)}` : '—'}
                        <br />
                        {position.takeProfit
                          ? `TP ${formatNumber(position.takeProfit)}`
                          : '—'}
                      </td>
                      <td className="py-2 text-right">
                        <NeumoButton
                          variant="ghost"
                          onClick={() =>
                            ticker && closePosition(position.id, ticker.last, 'manual')
                          }
                        >
                          Close
                        </NeumoButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </NeumorphCard>

        <NeumorphCard className="bg-elevated p-6">
          <h2 className="mb-4 text-lg font-semibold text-text">Orders</h2>
          {relevantOrders.length === 0 ? (
            <p className="text-sm text-text-muted">No orders placed</p>
          ) : (
            <div className="space-y-3">
              {relevantOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-lg border border-surface/60 bg-surface/50 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-text-muted">
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </div>
                    <span
                      className={cn(
                        'text-sm font-medium',
                        order.side === 'buy' ? 'text-up' : 'text-down'
                      )}
                    >
                      {order.side === 'buy' ? 'LONG' : 'SHORT'}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <div className="text-text-muted">Type</div>
                      <div className="font-mono text-text">{order.type.toUpperCase()}</div>
                    </div>
                    <div className="space-y-1 text-right">
                      <div className="text-text-muted">Quantity</div>
                      <div className="font-mono text-text">
                        {formatNumber(order.quantity, 4)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-text-muted">Price</div>
                      <div className="font-mono text-text">
                        {order.type === 'market'
                          ? 'Market'
                          : `$${formatNumber(order.price ?? 0)}`}
                      </div>
                    </div>
                    <div className="space-y-1 text-right">
                      <div className="text-text-muted">Status</div>
                      <div className="font-mono text-text">{order.status}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </NeumorphCard>
      </div>
    </div>
  );
}
