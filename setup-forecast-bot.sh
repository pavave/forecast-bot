#!/bin/bash

# ForecastBot Setup Script
# This script will create/update all necessary files for ML integration

set -e  # Exit on error

echo "🚀 ForecastBot Setup Script"
echo "================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

echo "📂 Creating directory structure..."
mkdir -p src/models
mkdir -p src/data
mkdir -p src/indicators
mkdir -p api

echo "✅ Directories created"
echo ""

# ============================================
# 1. Create src/models/transformerWorker.ts
# ============================================
echo "📝 Creating src/models/transformerWorker.ts..."
cat > src/models/transformerWorker.ts << 'EOF'
// src/models/transformerWorker.ts
// ML-based market sentiment analysis using Hugging Face

interface TransformerInput {
  price: number;
  volume: number;
  ema9: number;
  ema21: number;
  fundingRate: number;
  bollingerPosition: number; // -1 to 1
}

interface TransformerOutput {
  signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number; // 0-1
  reasoning: string;
}

export async function analyzeWithTransformer(
  input: TransformerInput
): Promise<TransformerOutput> {
  const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
  
  if (!HF_API_KEY) {
    // Fallback to rule-based system if no API key
    return ruleBasedAnalysis(input);
  }

  try {
    // Use FinBERT for financial sentiment
    const sentiment = await analyzeFinancialSentiment(input);
    
    // Combine with technical indicators
    const technicalScore = calculateTechnicalScore(input);
    
    // Weighted final decision
    const finalScore = sentiment.score * 0.6 + technicalScore * 0.4;
    
    let signal: 'bullish' | 'bearish' | 'neutral';
    if (finalScore > 0.2) signal = 'bullish';
    else if (finalScore < -0.2) signal = 'bearish';
    else signal = 'neutral';
    
    return {
      signal,
      confidence: Math.abs(finalScore),
      reasoning: generateReasoning(input, sentiment, technicalScore)
    };
  } catch (error) {
    console.error('Transformer error:', error);
    return ruleBasedAnalysis(input);
  }
}

async function analyzeFinancialSentiment(input: TransformerInput) {
  const HF_API_KEY = process.env.HUGGINGFACE_API_KEY!;
  
  // Create market context text for FinBERT
  const marketContext = `
    Price momentum: ${input.ema9 > input.ema21 ? 'positive' : 'negative'}. 
    Funding rate: ${input.fundingRate > 0 ? 'bullish' : 'bearish'} at ${(input.fundingRate * 100).toFixed(3)}%.
    Bollinger position: ${input.bollingerPosition > 0 ? 'upper band' : 'lower band'}.
    Volume trend: ${input.volume > 0 ? 'increasing' : 'decreasing'}.
  `;

  const response = await fetch(
    'https://api-inference.huggingface.co/models/ProsusAI/finbert',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: marketContext }),
    }
  );

  if (!response.ok) {
    throw new Error(`HF API error: ${response.status}`);
  }

  const result = await response.json();
  
  // FinBERT returns [positive, negative, neutral] scores
  const scores = result[0];
  const sentiment = scores.reduce((max: any, curr: any) => 
    curr.score > max.score ? curr : max
  );
  
  // Convert to -1 to 1 scale
  const sentimentMap: Record<string, number> = {
    'positive': 1,
    'negative': -1,
    'neutral': 0
  };
  
  return {
    score: sentimentMap[sentiment.label.toLowerCase()] * sentiment.score,
    label: sentiment.label
  };
}

function calculateTechnicalScore(input: TransformerInput): number {
  let score = 0;
  
  // EMA crossover (40% weight)
  if (input.ema9 > input.ema21) score += 0.4;
  else score -= 0.4;
  
  // Funding rate (30% weight)
  if (input.fundingRate > 0.01) score -= 0.3; // High funding = overheated
  else if (input.fundingRate < -0.01) score += 0.3; // Negative = undervalued
  
  // Bollinger position (30% weight)
  if (input.bollingerPosition < -0.8) score += 0.3; // Oversold
  else if (input.bollingerPosition > 0.8) score -= 0.3; // Overbought
  
  return Math.max(-1, Math.min(1, score));
}

function generateReasoning(
  input: TransformerInput,
  sentiment: { score: number; label: string },
  technicalScore: number
): string {
  const reasons: string[] = [];
  
  // EMA trend
  if (input.ema9 > input.ema21) {
    reasons.push('Short-term trend above long-term');
  } else {
    reasons.push('Downward momentum detected');
  }
  
  // Funding rate
  if (Math.abs(input.fundingRate) > 0.01) {
    reasons.push(`${input.fundingRate > 0 ? 'High' : 'Negative'} funding rate`);
  }
  
  // Bollinger bands
  if (Math.abs(input.bollingerPosition) > 0.8) {
    reasons.push(`Price near ${input.bollingerPosition > 0 ? 'upper' : 'lower'} band`);
  }
  
  // ML sentiment
  reasons.push(`ML sentiment: ${sentiment.label}`);
  
  return reasons.join(' • ');
}

function ruleBasedAnalysis(input: TransformerInput): TransformerOutput {
  const score = calculateTechnicalScore(input);
  
  let signal: 'bullish' | 'bearish' | 'neutral';
  if (score > 0.3) signal = 'bullish';
  else if (score < -0.3) signal = 'bearish';
  else signal = 'neutral';
  
  return {
    signal,
    confidence: Math.abs(score),
    reasoning: 'Rule-based analysis (no ML API key)'
  };
}
EOF

echo "✅ transformerWorker.ts created"

# ============================================
# 2. Create src/data/fetchBinance.ts
# ============================================
echo "📝 Creating src/data/fetchBinance.ts..."
cat > src/data/fetchBinance.ts << 'EOF'
// src/data/fetchBinance.ts
// Fetch real-time data from Binance Spot + Futures

interface BinanceKline {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
}

interface FundingRateData {
  symbol: string;
  fundingRate: string;
  fundingTime: number;
}

export interface BinanceMarketData {
  symbol: string;
  price: number;
  volume24h: number;
  priceChange24h: number;
  fundingRate: number;
  ohlcv: Array<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

/**
 * Fetch current market data for a symbol
 */
export async function fetchBinanceData(
  symbol: string = 'BTCUSDT',
  interval: string = '1h',
  limit: number = 100
): Promise<BinanceMarketData> {
  try {
    // Normalize symbol (remove hyphens, uppercase)
    const normalizedSymbol = symbol.replace('-', '').toUpperCase();
    
    // Fetch spot price + 24h stats
    const ticker24h = await fetch24hTicker(normalizedSymbol);
    
    // Fetch historical OHLCV
    const klines = await fetchKlines(normalizedSymbol, interval, limit);
    
    // Fetch funding rate (futures)
    const fundingRate = await fetchFundingRate(normalizedSymbol);
    
    return {
      symbol: normalizedSymbol,
      price: parseFloat(ticker24h.lastPrice),
      volume24h: parseFloat(ticker24h.volume),
      priceChange24h: parseFloat(ticker24h.priceChangePercent),
      fundingRate,
      ohlcv: klines.map(k => ({
        time: k.openTime,
        open: parseFloat(k.open),
        high: parseFloat(k.high),
        low: parseFloat(k.low),
        close: parseFloat(k.close),
        volume: parseFloat(k.volume)
      }))
    };
  } catch (error) {
    console.error('Binance fetch error:', error);
    throw new Error(`Failed to fetch data for ${symbol}`);
  }
}

async function fetch24hTicker(symbol: string) {
  const response = await fetch(
    `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`,
    { next: { revalidate: 60 } } // Cache for 1 minute
  );
  
  if (!response.ok) {
    throw new Error(`Binance API error: ${response.status}`);
  }
  
  return response.json();
}

async function fetchKlines(
  symbol: string,
  interval: string,
  limit: number
): Promise<BinanceKline[]> {
  const response = await fetch(
    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    { next: { revalidate: 300 } } // Cache for 5 minutes
  );
  
  if (!response.ok) {
    throw new Error(`Binance klines error: ${response.status}`);
  }
  
  const data = await response.json();
  
  return data.map((k: any[]) => ({
    openTime: k[0],
    open: k[1],
    high: k[2],
    low: k[3],
    close: k[4],
    volume: k[5],
    closeTime: k[6]
  }));
}

export async function fetchFundingRate(symbol: string): Promise<number> {
  try {
    // Binance Futures endpoint
    const response = await fetch(
      `https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&limit=1`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );
    
    if (!response.ok) {
      // If futures pair doesn't exist, return 0
      return 0;
    }
    
    const data: FundingRateData[] = await response.json();
    
    if (data.length === 0) return 0;
    
    return parseFloat(data[0].fundingRate);
  } catch (error) {
    console.warn('Funding rate not available:', error);
    return 0;
  }
}

/**
 * Get list of top trading pairs by volume
 */
export async function getTopPairs(limit: number = 20): Promise<string[]> {
  const response = await fetch(
    'https://api.binance.com/api/v3/ticker/24hr',
    { next: { revalidate: 3600 } }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch top pairs');
  }
  
  const tickers = await response.json();
  
  // Filter USDT pairs, sort by volume
  return tickers
    .filter((t: any) => t.symbol.endsWith('USDT'))
    .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
    .slice(0, limit)
    .map((t: any) => t.symbol);
}
EOF

echo "✅ fetchBinance.ts created"

# ============================================
# 3. Create src/indicators/fibonacci.ts
# ============================================
echo "📝 Creating src/indicators/fibonacci.ts..."
cat > src/indicators/fibonacci.ts << 'EOF'
// src/indicators/fibonacci.ts
// Fibonacci retracement and extension levels

export interface FibonacciLevels {
  high: number;
  low: number;
  retracement: {
    level_0: number;      // 0% (high)
    level_236: number;    // 23.6%
    level_382: number;    // 38.2%
    level_500: number;    // 50%
    level_618: number;    // 61.8% (golden ratio)
    level_786: number;    // 78.6%
    level_1000: number;   // 100% (low)
  };
  extension: {
    level_1272: number;   // 127.2%
    level_1618: number;   // 161.8%
    level_2618: number;   // 261.8%
  };
  currentLevel: string;   // Which level price is near
  signal: 'support' | 'resistance' | 'neutral';
}

/**
 * Calculate Fibonacci retracement levels
 * @param prices Array of closing prices
 * @param lookback Number of periods to look back (default: 100)
 */
export function calculateFibonacci(
  prices: number[],
  lookback: number = 100
): FibonacciLevels {
  if (prices.length < 2) {
    throw new Error('Need at least 2 prices for Fibonacci');
  }

  // Get recent prices
  const recentPrices = prices.slice(-lookback);
  
  // Find swing high and low
  const high = Math.max(...recentPrices);
  const low = Math.min(...recentPrices);
  const range = high - low;
  
  // Current price
  const currentPrice = prices[prices.length - 1];
  
  // Calculate retracement levels (from high to low)
  const retracement = {
    level_0: high,
    level_236: high - range * 0.236,
    level_382: high - range * 0.382,
    level_500: high - range * 0.500,
    level_618: high - range * 0.618,
    level_786: high - range * 0.786,
    level_1000: low
  };
  
  // Calculate extension levels (below low)
  const extension = {
    level_1272: low - range * 0.272,
    level_1618: low - range * 0.618,
    level_2618: low - range * 1.618
  };
  
  // Determine current level and signal
  const { currentLevel, signal } = analyzeFibPosition(
    currentPrice,
    retracement,
    extension
  );
  
  return {
    high,
    low,
    retracement,
    extension,
    currentLevel,
    signal
  };
}

function analyzeFibPosition(
  price: number,
  retracement: FibonacciLevels['retracement'],
  extension: FibonacciLevels['extension']
): { currentLevel: string; signal: 'support' | 'resistance' | 'neutral' } {
  const tolerance = 0.005; // 0.5% tolerance
  
  // Check retracement levels
  const levels = [
    { name: '0% (High)', value: retracement.level_0, type: 'resistance' },
    { name: '23.6%', value: retracement.level_236, type: 'resistance' },
    { name: '38.2%', value: retracement.level_382, type: 'support' },
    { name: '50%', value: retracement.level_500, type: 'support' },
    { name: '61.8% (Golden)', value: retracement.level_618, type: 'support' },
    { name: '78.6%', value: retracement.level_786, type: 'support' },
    { name: '100% (Low)', value: retracement.level_1000, type: 'support' },
  ];
  
  // Find nearest level
  let nearest = levels[0];
  let minDistance = Math.abs(price - nearest.value);
  
  for (const level of levels) {
    const distance = Math.abs(price - level.value);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = level;
    }
  }
  
  // Check if price is near a level
  const percentDiff = minDistance / price;
  if (percentDiff < tolerance) {
    return {
      currentLevel: `Near ${nearest.name}`,
      signal: nearest.type as 'support' | 'resistance'
    };
  }
  
  // Check if between levels
  if (price > retracement.level_618 && price < retracement.level_382) {
    return {
      currentLevel: 'Between 38.2% and 61.8%',
      signal: 'neutral'
    };
  }
  
  if (price > retracement.level_500) {
    return {
      currentLevel: 'Above 50% retracement',
      signal: 'resistance'
    };
  }
  
  return {
    currentLevel: 'Below key support',
    signal: 'support'
  };
}

/**
 * Get emoji representation of Fibonacci signal
 */
export function getFibonacciEmoji(signal: string): string {
  const emojiMap: Record<string, string> = {
    'support': '🟢',
    'resistance': '🔴',
    'neutral': '⚪️'
  };
  return emojiMap[signal] || '⚪️';
}

/**
 * Format Fibonacci analysis for display
 */
export function formatFibonacciAnalysis(fib: FibonacciLevels): string {
  const emoji = getFibonacciEmoji(fib.signal);
  return `${emoji} ${fib.currentLevel} • ${fib.signal}`;
}
EOF

echo "✅ fibonacci.ts created"

# ============================================
# 4. Create api/telegramWebhook.ts
# ============================================
echo "📝 Creating api/telegramWebhook.ts..."
cat > api/telegramWebhook.ts << 'EOF'
// api/telegramWebhook.ts
// Vercel serverless function for Telegram bot webhook

import { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchBinanceData } from '../src/data/fetchBinance';
import { ForecastEngine } from '../src/ForecastEngine';
import { formatUserMessage } from '../src/format/userMessage';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    text?: string;
    date: number;
  };
  callback_query?: {
    id: string;
    from: { id: number };
    message: { message_id: number; chat: { id: number } };
    data: string;
  };
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const update: TelegramUpdate = req.body;

    // Handle regular messages
    if (update.message?.text) {
      await handleMessage(update.message);
    }

    // Handle button callbacks
    if (update.callback_query) {
      await handleCallback(update.callback_query);
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}

async function handleMessage(message: TelegramUpdate['message']) {
  if (!message) return;

  const chatId = message.chat.id;
  const text = message.text || '';

  // Commands
  if (text.startsWith('/start')) {
    await sendWelcomeMessage(chatId);
  } else if (text.startsWith('/help')) {
    await sendHelpMessage(chatId);
  } else if (text.startsWith('/forecast')) {
    const symbol = text.split(' ')[1] || 'BTCUSDT';
    await sendForecast(chatId, symbol);
  } else if (text.startsWith('/top')) {
    await sendTopPairs(chatId);
  } else {
    // Try to parse as symbol
    const symbol = text.replace(/[^a-zA-Z]/g, '').toUpperCase();
    if (symbol.length >= 3) {
      await sendForecast(chatId, symbol + 'USDT');
    }
  }
}

async function handleCallback(callback: TelegramUpdate['callback_query']) {
  if (!callback) return;

  const chatId = callback.message.chat.id;
  const data = callback.data;

  // Answer callback to remove loading state
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callback.id })
  });

  // Handle pair selection
  if (data.startsWith('pair_')) {
    const symbol = data.replace('pair_', '');
    await sendForecast(chatId, symbol);
  }
}

async function sendWelcomeMessage(chatId: number) {
  const message = `
🤖 <b>Welcome to ForecastBot!</b>

I analyze crypto markets using:
📊 Technical indicators (EMA, Bollinger, Fibonacci)
🧠 AI-powered sentiment analysis
💰 Funding rate metrics

<b>Commands:</b>
/forecast BTC - Get forecast for BTC/USDT
/top - See top trading pairs
/help - Show this message

Or just send me a symbol like "BTC" or "ETH"
`;

  await sendMessage(chatId, message, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📈 BTC Forecast', callback_data: 'pair_BTCUSDT' },
          { text: '📊 ETH Forecast', callback_data: 'pair_ETHUSDT' }
        ],
        [
          { text: '🔝 Top Pairs', callback_data: 'top_pairs' }
        ]
      ]
    }
  });
}

async function sendHelpMessage(chatId: number) {
  const message = `
<b>📚 How to use ForecastBot</b>

<b>Quick forecast:</b>
• Send symbol: <code>BTC</code>, <code>ETH</code>, <code>SOL</code>
• Use command: <code>/forecast BTC</code>

<b>What I analyze:</b>
📈 EMA crossovers (9/21 periods)
�� Bollinger Bands position
🎯 Fibonacci retracement levels
💰 Funding rate (futures sentiment)
🧠 AI sentiment analysis

<b>Signals explained:</b>
🟢 Bullish - Upward momentum
🔴 Bearish - Downward pressure
⚪ Neutral - Consolidation phase

<i>Note: This is not financial advice. Always DYOR!</i>
`;

  await sendMessage(chatId, message);
}

async function sendForecast(chatId: number, symbol: string) {
  try {
    // Send "typing" action
    await fetch(`${TELEGRAM_API}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action: 'typing' })
    });

    // Fetch market data
    const marketData = await fetchBinanceData(symbol);

    // Generate forecast
    const engine = new ForecastEngine();
    const forecast = await engine.analyze(marketData);

    // Format message
    const message = formatUserMessage(forecast, marketData);

    // Send forecast
    await sendMessage(chatId, message, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔄 Refresh', callback_data: `pair_${symbol}` },
            { text: '📊 Chart', url: `https://www.binance.com/en/trade/${symbol}` }
          ]
        ]
      }
    });
  } catch (error) {
    console.error('Forecast error:', error);
    await sendMessage(
      chatId,
      `❌ Could not generate forecast for ${symbol}. Please check the symbol and try again.`
    );
  }
}

async function sendTopPairs(chatId: number) {
  const topPairs = [
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
    'ADAUSDT', 'DOGEUSDT', 'MATICUSDT', 'DOTUSDT', 'AVAXUSDT'
  ];

  const buttons = topPairs.map(symbol => [{
    text: symbol.replace('USDT', ''),
    callback_data: `pair_${symbol}`
  }]);

  await sendMessage(
    chatId,
    '🔝 <b>Select a trading pair:</b>',
    { reply_markup: { inline_keyboard: buttons } }
  );
}

async function sendMessage(
  chatId: number,
  text: string,
  options: any = {}
) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...options
    })
  });
}
EOF

echo "✅ telegramWebhook.ts created"

# ============================================
# 5. Create .env.example
# ============================================
echo "📝 Creating .env.example..."
cat > .env.example << 'EOF'
# .env.example
# Copy to .env.local for development

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_from_@BotFather

# Hugging Face (for ML model)
# Get free API key at https://huggingface.co/settings/tokens
HUGGINGFACE_API_KEY=hf_your_api_key_here

# Optional: Binance API (not required for basic functionality)
# BINANCE_API_KEY=your_binance_api_key
# BINANCE_SECRET_KEY=your_binance_secret_key

# Vercel deployment URL (set automatically on Vercel)
# VERCEL_URL=your-app.vercel.app
EOF

echo "✅ .env.example created"

# ============================================
# 6. Update package.json
# ============================================
echo "📝 Updating package.json..."

# Check if @vercel/node is already in dependencies
if ! grep -q "@vercel/node" package.json; then
    echo "Adding @vercel/node to dependencies..."
    npm install --save @vercel/node
fi

echo "✅ package.json updated"

# ============================================
# 7. Create DEPLOYMENT.md
# ============================================
echo "📝 Creating DEPLOYMENT.md..."
cat > DEPLOYMENT.md << 'EOF'
# 🚀 ForecastBot Deployment Guide

## Quick Start

### 1. Setup Telegram Bot

1. Message [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow instructions
3. Copy your bot token

**Set commands:**
```
/setcommands

forecast - Get market forecast
top - Show top pairs
help - Show help
```

### 2. Get Hugging Face API Key (Optional)

1. Go to https://huggingface.co/settings/tokens
2. Create new token (read access is enough)
3. Copy the token

### 3. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### 4. Set Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

```
TELEGRAM_BOT_TOKEN=1234567890:ABCdef...
HUGGINGFACE_API_KEY=hf_abcdef123456...
```

### 5. Setup Webhook

Replace `<BOT_TOKEN>` and `<YOUR_VERCEL_URL>`:

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://<YOUR_VERCEL_URL>/api/telegramWebhook"
```

## Testing Locally

```bash
# Copy environment file
cp .env.example .env.local

# Add your tokens to .env.local

# Install dependencies
npm install

# Run dev server
vercel dev

# Test in browser
http://localhost:3000/api/forecast?symbol=BTCUSDT
```

## Troubleshooting

**Webhook not working?**
```bash
# Check webhook status
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```

**Forecast errors?**
- Check Binance API is accessible
- Verify symbol format (e.g., BTCUSDT not BTC-USDT)

**ML model not working?**
- Verify HUGGINGFACE_API_KEY is set
- Check API quota at https://huggingface.co

## Commands

- `/
