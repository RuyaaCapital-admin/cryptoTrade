'use client';

import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  IPriceLine,
  ISeriesApi,
  PriceLineOptions,
  SeriesMarker,
  Time,
  UTCTimestamp,
  createChart,
} from 'lightweight-charts';
import { useEffect, useMemo, useRef } from 'react';
import { useExchange } from '@/hooks/use-exchange';
import { useTradingStore } from '@/lib/stores/trading-store';
import { useMarketStore } from '@/lib/stores/market-store';

interface CandlestickChartProps {
  symbol: string;
  interval?: string;
}

interface CandlePoint {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
}

function intervalToMs(interval: string): number {
  const match = interval.match(/^(\d+)([smhdw])$/i);
  if (!match) {
    return 60_000;
  }

  const [, valueStr, unit] = match;
  const value = parseInt(valueStr, 10);

  switch (unit.toLowerCase()) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60_000;
    case 'h':
      return value * 3_600_000;
    case 'd':
      return value * 86_400_000;
    case 'w':
      return value * 7 * 86_400_000;
    default:
      return 60_000;
  }
}

type CandlestickSeriesApi = ISeriesApi<'Candlestick'> & {
  setMarkers?: (markers: SeriesMarker<Time>[]) => void;
};

export function CandlestickChart({ symbol, interval = '1m' }: CandlestickChartProps) {
  const { adapter } = useExchange();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const seriesRef = useRef<CandlestickSeriesApi | null>(null);
  const lastCandleRef = useRef<CandlePoint | null>(null);
  const priceLinesRef = useRef<Map<string, IPriceLine>>(new Map());
  const intervalMs = useMemo(() => intervalToMs(interval), [interval]);

  const ticker = useMarketStore((state) => state.tickers.get(symbol));
  const openPositions = useTradingStore((state) =>
    state.positions.filter((pos) => pos.symbol === symbol && pos.isPaper)
  );

  useEffect(() => {
    if (!adapter || !containerRef.current) {
      return;
    }

    const chart = createChart(containerRef.current, {
      height: 420,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'var(--text-muted)',
      },
      grid: {
        vertLines: { color: 'rgba(148, 163, 184, 0.1)' },
        horzLines: { color: 'rgba(148, 163, 184, 0.1)' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: 'rgba(148, 163, 184, 0.2)' },
      timeScale: { borderColor: 'rgba(148, 163, 184, 0.2)' },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#16a34a',
      downColor: '#dc2626',
      borderVisible: false,
      wickUpColor: '#16a34a',
      wickDownColor: '#dc2626',
    }) as CandlestickSeriesApi;

    seriesRef.current = series;

    let cancelled = false;

    async function loadCandles() {
      try {
        const candles = await adapter!.rest.getCandles(symbol, interval, 500);
        if (cancelled) {
          return;
        }

        const formatted = candles.map((candle) => ({
          time: Math.floor(candle.timestamp / 1000) as UTCTimestamp,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        }));

        series.setData(formatted);
        lastCandleRef.current =
          formatted.length > 0 ? formatted[formatted.length - 1] : null;
      } catch (error) {
        console.error('Failed to load candles', error);
      }
    }

    loadCandles();

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        chart.applyOptions({ width });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      chart.remove();
      seriesRef.current = null;
      lastCandleRef.current = null;
      priceLinesRef.current.clear();
    };
  }, [adapter, interval, symbol]);

  useEffect(() => {
    if (!ticker || !seriesRef.current) {
      return;
    }

    const now = ticker.timestamp ?? Date.now();
    const price = ticker.last;
    const existing = lastCandleRef.current;
    const candleTime = Math.floor(now / 1000) as UTCTimestamp;

    if (!existing) {
      const freshCandle: CandlePoint = {
        time: candleTime,
        open: price,
        high: price,
        low: price,
        close: price,
      };
      lastCandleRef.current = freshCandle;
      seriesRef.current.update(freshCandle);
      return;
    }

    const existingMs = (existing.time as number) * 1000;

    if (now - existingMs >= intervalMs) {
      const newCandle: CandlePoint = {
        time: candleTime,
        open: price,
        high: price,
        low: price,
        close: price,
      };
      lastCandleRef.current = newCandle;
      seriesRef.current.update(newCandle);
      return;
    }

    const updated: CandlePoint = {
      ...existing,
      close: price,
      high: Math.max(existing.high, price),
      low: Math.min(existing.low, price),
    };

    lastCandleRef.current = updated;
    seriesRef.current.update(updated);
  }, [intervalMs, ticker]);

  useEffect(() => {
    if (!seriesRef.current) {
      return;
    }

    const markers: SeriesMarker<Time>[] = openPositions.map((position) => ({
      time: Math.floor(position.openedAt / 1000) as UTCTimestamp,
      position: position.side === 'long' ? 'belowBar' : 'aboveBar',
      color: position.side === 'long' ? '#16a34a' : '#dc2626',
      shape: position.side === 'long' ? 'arrowUp' : 'arrowDown',
      text: `${position.side === 'long' ? 'Long' : 'Short'} ${position.quantity} @ ${position.entryPrice.toFixed(2)}`,
    }));

    if (seriesRef.current?.setMarkers) {
      seriesRef.current.setMarkers(markers);
    }
  }, [openPositions]);

  useEffect(() => {
    if (!seriesRef.current) {
      return;
    }

    const series = seriesRef.current;
    const priceLines = priceLinesRef.current;
    const activeIds = new Set(openPositions.map((position) => position.id));

    for (const [positionId, line] of Array.from(priceLines.entries())) {
      if (!activeIds.has(positionId)) {
        series.removePriceLine(line);
        priceLines.delete(positionId);
      }
    }

    const formatPnl = (value: number) => {
      const sign = value > 0 ? '+' : '';
      return `${sign}${value.toFixed(2)}`;
    };

    const buildTitle = (positionUnrealized: number, positionPercent: number, side: 'long' | 'short') => {
      const sideLabel = side === 'long' ? 'Long' : 'Short';
      const pnlText = formatPnl(positionUnrealized);
      const pctText = formatPnl(positionPercent);
      return `${sideLabel} • ${pctText}% (${pnlText})`;
    };

    openPositions.forEach((position) => {
      const color = position.side === 'long' ? '#16a34a' : '#dc2626';
      const options: PriceLineOptions = {
        price: position.entryPrice,
        color,
        lineWidth: 2,
        lineStyle: 0,
        lineVisible: true,
        axisLabelVisible: true,
        axisLabelColor: color,
        axisLabelTextColor: '#ffffff',
        title: buildTitle(position.unrealizedPnl, position.pnlPercent, position.side),
      };

      const existingLine = priceLines.get(position.id);

      if (existingLine) {
        existingLine.applyOptions(options);
      } else {
        const createdLine = series.createPriceLine(options);
        priceLines.set(position.id, createdLine);
      }
    });
  }, [openPositions]);

  return <div ref={containerRef} className="h-[420px] w-full" />;
}
