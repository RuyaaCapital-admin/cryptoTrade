'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useExchange } from '@/hooks/use-exchange';
import { useTradingStore } from '@/lib/stores/trading-store';
import { useMarketStore } from '@/lib/stores/market-store';

interface CandlestickChartProps {
  symbol: string;
  interval?: string;
}

interface CandlePoint {
  time: number; // unix ms
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

const CHART_HEIGHT = 420;
const PADDING_X = 24;
const PADDING_Y = 16;

export function CandlestickChart({ symbol, interval = '1m' }: CandlestickChartProps) {
  const { adapter } = useExchange();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: CHART_HEIGHT });
  const [candles, setCandles] = useState<CandlePoint[]>([]);
  const intervalMs = useMemo(() => intervalToMs(interval), [interval]);

  const ticker = useMarketStore((state) => state.tickers.get(symbol));
  const openPositions = useTradingStore((state) =>
    state.positions.filter((pos) => pos.symbol === symbol && pos.isPaper)
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!adapter) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const response = await adapter.rest.getCandles(symbol, interval, 200);
        if (cancelled) {
          return;
        }

        const formatted = response
          .map((candle) => ({
            time: candle.timestamp,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
          }))
          .sort((a, b) => a.time - b.time);

        setCandles(formatted);
      } catch (error) {
        console.error('Failed to load candles', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [adapter, interval, symbol]);

  useEffect(() => {
    if (!ticker) {
      return;
    }

    const price = ticker.last;
    const now = ticker.timestamp ?? Date.now();
    const bucketStart = Math.floor(now / intervalMs) * intervalMs;

    setCandles((prev) => {
      if (prev.length === 0) {
        return [
          {
            time: bucketStart,
            open: price,
            high: price,
            low: price,
            close: price,
          },
        ];
      }

      const last = prev[prev.length - 1];

      if (bucketStart > last.time) {
        const next = [
          ...prev.slice(Math.max(0, prev.length - 199)),
          {
            time: bucketStart,
            open: price,
            high: price,
            low: price,
            close: price,
          },
        ];
        return next;
      }

      const updated = {
        ...last,
        close: price,
        high: Math.max(last.high, price),
        low: Math.min(last.low, price),
      };

      return [...prev.slice(0, -1), updated];
    });
  }, [ticker, intervalMs]);

  const chartWidth = Math.max(dimensions.width, 0);
  const chartHeight = dimensions.height || CHART_HEIGHT;
  const drawableWidth = Math.max(chartWidth - PADDING_X * 2, 1);
  const drawableHeight = Math.max(chartHeight - PADDING_Y * 2, 1);

  const priceDomain = useMemo(() => {
    if (candles.length === 0) {
      return { min: 0, max: 1 };
    }

    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    for (const candle of candles) {
      min = Math.min(min, candle.low);
      max = Math.max(max, candle.high);
    }

    for (const position of openPositions) {
      min = Math.min(min, position.entryPrice);
      max = Math.max(max, position.entryPrice);
    }

    if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
      const price = candles[candles.length - 1].close;
      const padding = Math.max(price * 0.002, 1);
      return { min: price - padding, max: price + padding };
    }

    const padding = (max - min) * 0.05;
    return { min: min - padding, max: max + padding };
  }, [candles, openPositions]);

  const firstTime = candles[0]?.time ?? 0;
  const lastTime = candles[candles.length - 1]?.time ?? firstTime;
  const timeRange = Math.max(lastTime - firstTime, intervalMs);

  const scaleY = (value: number) => {
    const clamped = Math.min(Math.max(value, priceDomain.min), priceDomain.max);
    const ratio = (clamped - priceDomain.min) / (priceDomain.max - priceDomain.min || 1);
    return chartHeight - PADDING_Y - ratio * drawableHeight;
  };

  const timeToX = (time: number) => {
    if (candles.length <= 1) {
      return PADDING_X + drawableWidth / 2;
    }

    const ratio = (time - firstTime) / (timeRange || 1);
    return PADDING_X + Math.min(Math.max(ratio, 0), 1) * drawableWidth;
  };

  const step = candles.length > 1 ? drawableWidth / (candles.length - 1) : drawableWidth;
  const candleWidth = Math.max(Math.min(step * 0.6, 22), 3);

  const formatNumber = (value: number) => {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (candles.length === 0) {
    return (
      <div
        ref={containerRef}
        className="flex h-[420px] items-center justify-center text-sm text-text-muted"
      >
        Loading chart...
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-[420px] w-full">
      <svg width={chartWidth} height={chartHeight} role="img" aria-label={`${symbol} price chart`}>
        <rect
          x={0}
          y={0}
          width={chartWidth}
          height={chartHeight}
          fill="transparent"
        />

        {candles.map((candle, index) => {
          const xCenter = timeToX(candle.time);
          const x = xCenter - candleWidth / 2;
          const yHigh = scaleY(candle.high);
          const yLow = scaleY(candle.low);
          const yOpen = scaleY(candle.open);
          const yClose = scaleY(candle.close);
          const isUp = candle.close >= candle.open;
          const bodyTop = Math.min(yOpen, yClose);
          const bodyHeight = Math.max(Math.abs(yClose - yOpen), 1);
          const color = isUp ? '#16a34a' : '#dc2626';

          return (
            <g key={candle.time ?? index}>
              <line
                x1={xCenter}
                x2={xCenter}
                y1={yHigh}
                y2={yLow}
                stroke={color}
                strokeWidth={1}
                strokeLinecap="round"
              />
              <rect
                x={x}
                y={bodyTop}
                width={candleWidth}
                height={bodyHeight}
                fill={color}
                rx={1.5}
              />
            </g>
          );
        })}

        {openPositions.map((position) => {
          const y = scaleY(position.entryPrice);
          const color = position.side === 'long' ? '#16a34a' : '#dc2626';
          const markerX = timeToX(position.openedAt);
          const triangleHeight = 10;
          const triangleWidth = 10;
          const markerPath =
            position.side === 'long'
              ? `M ${markerX} ${y - triangleHeight} L ${markerX - triangleWidth / 2} ${y} L ${markerX +
                  triangleWidth / 2} ${y} Z`
              : `M ${markerX} ${y + triangleHeight} L ${markerX - triangleWidth / 2} ${y} L ${markerX +
                  triangleWidth / 2} ${y} Z`;

          const pnlSign = position.unrealizedPnl >= 0 ? '+' : '';
          const percentSign = position.pnlPercent >= 0 ? '+' : '';
          const label = `${position.side === 'long' ? 'Long' : 'Short'} • ${percentSign}${position.pnlPercent.toFixed(
            2
          )}% (${pnlSign}${position.unrealizedPnl.toFixed(2)})`;

          return (
            <g key={position.id}>
              <line
                x1={PADDING_X}
                x2={chartWidth - PADDING_X}
                y1={y}
                y2={y}
                stroke={color}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                opacity={0.7}
              />
              <path d={markerPath} fill={color} opacity={0.85} />
              <text
                x={chartWidth - PADDING_X - 6}
                y={y - 6}
                textAnchor="end"
                fontSize={12}
                fill={color}
                fontWeight={600}
              >
                {label}
              </text>
            </g>
          );
        })}

        <text
          x={chartWidth - PADDING_X}
          y={PADDING_Y + 12}
          textAnchor="end"
          fontSize={12}
          fill="#4B5563"
        >
          Last: ${formatNumber(candles[candles.length - 1].close)}
        </text>
      </svg>
    </div>
  );
}
