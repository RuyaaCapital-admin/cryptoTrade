/*
  # Crypto Trading App Schema

  1. New Tables
    - `user_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `selected_exchange` (text) - current exchange
      - `favorite_symbols` (jsonb) - array of favorite symbols
      - `currency` (text) - display currency
      - `timezone` (text) - user timezone
      - `number_format` (text) - number format preference
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `exchange_api_keys`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `exchange_name` (text) - exchange identifier
      - `api_key` (text) - encrypted API key
      - `api_secret` (text) - encrypted API secret
      - `passphrase` (text) - encrypted passphrase (for some exchanges)
      - `is_active` (boolean) - whether key is enabled
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `positions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `exchange_name` (text)
      - `symbol` (text) - canonical symbol
      - `side` (text) - long/short
      - `quantity` (numeric) - position size
      - `entry_price` (numeric)
      - `current_price` (numeric) - updated live
      - `unrealized_pnl` (numeric)
      - `realized_pnl` (numeric)
      - `is_paper` (boolean) - paper vs live trading
      - `opened_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `orders`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `exchange_name` (text)
      - `symbol` (text) - canonical symbol
      - `side` (text) - buy/sell
      - `type` (text) - market/limit
      - `quantity` (numeric)
      - `price` (numeric) - for limit orders
      - `status` (text) - pending/filled/cancelled
      - `filled_quantity` (numeric)
      - `average_fill_price` (numeric)
      - `is_paper` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `trades`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `order_id` (uuid, foreign key to orders)
      - `exchange_name` (text)
      - `symbol` (text)
      - `side` (text)
      - `quantity` (numeric)
      - `price` (numeric)
      - `fee` (numeric)
      - `is_paper` (boolean)
      - `executed_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - API keys are encrypted at application level before storage
*/

-- User Preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  selected_exchange text DEFAULT 'binance',
  favorite_symbols jsonb DEFAULT '[]'::jsonb,
  currency text DEFAULT 'USD',
  timezone text DEFAULT 'UTC',
  number_format text DEFAULT 'en-US',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Exchange API Keys
CREATE TABLE IF NOT EXISTS exchange_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  exchange_name text NOT NULL,
  api_key text NOT NULL,
  api_secret text NOT NULL,
  passphrase text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE exchange_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own API keys"
  ON exchange_api_keys FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own API keys"
  ON exchange_api_keys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys"
  ON exchange_api_keys FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys"
  ON exchange_api_keys FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Positions
CREATE TABLE IF NOT EXISTS positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  exchange_name text NOT NULL,
  symbol text NOT NULL,
  side text NOT NULL,
  quantity numeric NOT NULL,
  entry_price numeric NOT NULL,
  current_price numeric NOT NULL,
  unrealized_pnl numeric DEFAULT 0,
  realized_pnl numeric DEFAULT 0,
  is_paper boolean DEFAULT true,
  opened_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own positions"
  ON positions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own positions"
  ON positions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own positions"
  ON positions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own positions"
  ON positions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  exchange_name text NOT NULL,
  symbol text NOT NULL,
  side text NOT NULL,
  type text NOT NULL,
  quantity numeric NOT NULL,
  price numeric,
  status text DEFAULT 'pending',
  filled_quantity numeric DEFAULT 0,
  average_fill_price numeric DEFAULT 0,
  is_paper boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own orders"
  ON orders FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trades
CREATE TABLE IF NOT EXISTS trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  exchange_name text NOT NULL,
  symbol text NOT NULL,
  side text NOT NULL,
  quantity numeric NOT NULL,
  price numeric NOT NULL,
  fee numeric DEFAULT 0,
  is_paper boolean DEFAULT true,
  executed_at timestamptz DEFAULT now()
);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trades"
  ON trades FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades"
  ON trades FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_exchange_api_keys_user_id ON exchange_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_user_id ON positions(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_positions_symbol ON positions(symbol);