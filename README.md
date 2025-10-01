# CryptoTrade - Real-Time Crypto Trading Platform

A production-ready cryptocurrency trading platform built with Next.js, TypeScript, and real exchange integrations. Features live WebSocket market data, order book visualization, paper trading, and a neumorphic design system.

## Features

- **Real Exchange Integration**: Direct connections to Binance and Coinbase Advanced via WebSocket and REST APIs
- **Live Market Data**: Real-time ticker updates, order books, and trade streams
- **Paper Trading**: Practice trading with simulated fills based on live market prices
- **Live Trading**: Optional live trading with user-provided API keys (feature flag: `ENABLE_LIVE_TRADING`)
- **Portfolio Management**: Real-time P&L tracking with live market prices
- **Neumorphic Design**: Modern, monochrome UI with soft shadows (NO blue colors)
- **Security First**: Supabase backend with Row Level Security for all user data

## Tech Stack

- **Framework**: Next.js 13 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom neumorphic design tokens
- **State Management**: Zustand
- **Database**: Supabase (PostgreSQL)
- **Validation**: Zod
- **Real-time**: WebSocket connections to exchanges
- **Precision Math**: Decimal.js for financial calculations

## Architecture

### Exchange Adapters

The platform uses a pluggable adapter pattern for exchange integrations:

```typescript
interface ExchangeAdapter {
  name: string;
  wsConnect(): Promise<void>;
  subscribe(params: SubscriptionParams): Promise<void>;
  rest: {
    getCandles(symbol: string, interval: string, limit: number): Promise<Candle[]>;
    getInstruments(): Promise<Instrument[]>;
  };
  map: {
    symbolToExchange(canonical: string): string;
    symbolFromExchange(exchange: string): string;
  };
}
```

**Available Adapters:**
- `BinanceAdapter`: Binance Spot market
- `CoinbaseAdapter`: Coinbase Advanced Trade

### Data Flow

1. **Market Data**: WebSocket → Exchange Adapter → Zustand Store → React Components
2. **Orders (Paper)**: UI → Zustand Store → Simulated Fill Engine → Positions
3. **Orders (Live)**: UI → Supabase → Edge Function → Exchange API → Webhook → Database
4. **Historical Data**: REST API → Exchange Adapter → Component State

### Database Schema

- `user_preferences`: User settings and exchange selection
- `exchange_api_keys`: Encrypted API keys for live trading
- `positions`: Open positions (paper and live)
- `orders`: Order history and status
- `trades`: Filled trade records

All tables have Row Level Security enabled with policies requiring authentication.

## Environment Variables

Required variables (automatically configured in production):

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
ENABLE_LIVE_TRADING=false  # Set to true to enable live trading
```

## Pages

### /markets
- Real-time market table with 50+ symbols
- Search and filtering
- Favorites system
- Click any symbol to trade

### /trade/[symbol]
- Live price chart (planned)
- Order book with 15 levels per side
- Recent trades stream
- Order ticket (Paper/Live tabs)
- Market and limit orders

### /portfolio
- Total equity calculation
- Unrealized and realized P&L
- Open positions table
- Real-time price updates

### /settings
- General preferences
- Exchange API key management
- Risk management settings

## Development

```bash
npm install
npm run dev
```

The app connects to real exchanges immediately on load. No mocks or stubs anywhere.

## Build

```bash
npm run build
npm start
```

## Testing

```bash
# Run validation tests
npm test

# Tests included:
# - No mock/stub/fake data references
# - No blue colors in codebase
```

## Design System

### Colors
- Background: `#F6F7F9`
- Surface: `#ECEFF4`
- Elevated: `#E3E7ED`
- Text: `#1F2937`
- Text Muted: `#4B5563`
- Up (Green): `#16A34A`
- Down (Red): `#DC2626`

**NO blue colors anywhere** - verified by automated tests.

### Shadows
- Outer: `-8px -8px 16px rgba(255,255,255,0.9), 12px 12px 24px rgba(31,41,55,0.15)`
- Inner: `inset -4px -4px 8px rgba(255,255,255,0.9), inset 6px 6px 12px rgba(31,41,55,0.15)`

### Components
- `NeumorphCard`: Interactive card with neumorphic shadows
- `NeumoButton`: Button with lift on hover, pressed state
- All shadcn/ui components styled for neumorphic theme

## Security

- All API keys encrypted at rest
- Row Level Security on all database tables
- No secrets in logs or client-side code
- Supabase Auth for user authentication
- API keys never leave the server

## Live Trading

To enable live trading:

1. Set `ENABLE_LIVE_TRADING=true`
2. Add exchange API keys in Settings → API Keys
3. Keys are encrypted before storage
4. Orders route through Edge Functions for security

## Reliability

- Auto-reconnect with exponential backoff
- Heartbeat monitoring
- Rate limit handling
- Sequence gap detection
- Multiple exchange fallback support (user opt-in)

## Constraints

- **No sidebars**: Top app bar only
- **No dark mode**: Light theme with neumorphic design
- **No mock data**: All data from real exchanges
- **No blue colors**: Monochrome with green/red accents
- **WCAG AA**: Full keyboard navigation and accessibility

## License

Private
