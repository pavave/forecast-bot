#!/bin/bash

# ForecastBot Complete Rebuild Script
# This will DELETE old code and create a fresh bot from scratch

set -e

echo "🚀 ForecastBot Complete Rebuild"
echo "================================"
echo ""
echo "⚠️  WARNING: This will DELETE existing code!"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

# ============================================
# STEP 1: Backup and Clean
# ============================================
echo "📦 Creating backup..."
if [ -d "src" ] || [ -d "api" ]; then
    BACKUP_DIR="backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    [ -d "src" ] && cp -r src "$BACKUP_DIR/" 2>/dev/null || true
    [ -d "api" ] && cp -r api "$BACKUP_DIR/" 2>/dev/null || true
    echo "✅ Backup created in $BACKUP_DIR/"
fi

echo "🗑️  Removing old files..."
rm -rf src/ api/ telegram/ 2>/dev/null || true
rm -f tsconfig.json vercel.json 2>/dev/null || true

# ============================================
# STEP 2: Create Directory Structure
# ============================================
echo "📂 Creating directory structure..."
mkdir -p src/{models,data,indicators,format}
mkdir -p api
mkdir -p telegram

# ============================================
# STEP 3: Create Core Files
# ============================================

# ============================================
# src/data/types.ts
# ============================================
cat > src/data/types.ts << 'EOF'
// Core data types for ForecastBot

export interface MarketData {
  symbol: string;
  price: number;
  volume24h: number;
  priceChange24h: number;
  fundingRate: number;
  ohlcv: OHLCV[];
}

export interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ForecastResult {
  symbol: string;
  price: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  analysis: {
    ema: {
      ema9: number;
      ema21: number;
      trend: string;
    };
    bollinger: {
      upper: number;
      middle: number;
      lower: number;
      position: number;
      signal: string;
    };
    fibonacci: {
      currentLevel: string;
      signal: string;
    };
    fundingRate: number;
    ml: {
      signal: string;
      confidence: number;
      reasoning: string;
    };
  };
  recommendation: string;
  timestamp: number;
}
EOF

# ============================================
# src/data/fetchBinance.ts
# ============================================
cat > src/data/fetchBinance.ts << 'EOF'
import { MarketData } from './types';

export async function fetchBinanceData(
  symbol: string = 'BTCUSDT',
  interval: string = '1h',
  limit: number = 100
): Promise<MarketData> {
  const normalized = symbol.replace(/[-_]/g, '').toUpperCase();
  
  const [ticker, klines, funding] = await Promise.all([
    fetch24hTicker(normalized),
    fetchKlines(normalized, interval, limit),
    fetchFundingRate(normalized)
  ]);

  return {
    symbol: normalized,
    price: parseFloat(ticker.lastPrice),
    volume24h: parseFloat(ticker.volume),
    priceChange24h: parseFloat(ticker.priceChangePercent),
    fundingRate: funding,
    ohlcv: klines.map((k: any[]) => ({
      time: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5])
    }))
  };
}

async function fetch24hTicker(symbol: string) {
  const res = await fetch(
    `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`
  );
  if (!res.ok) throw new Error(`Binance API error: ${res.status}`);
  return res.json();
}

async function fetchKlines(symbol: string, interval: string, limit: number) {
  const res = await fetch(
    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
  );
  if (!res.ok) throw new Error(`Klines error: ${res.status}`);
  return res.json();
}

async function fetchFundingRate(symbol: string): Promise<number> {
  try {
    const res = await fetch(
      `https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&limit=1`
    );
    if (!res.ok) return 0;
    const data = await res.json();
    return data.length > 0 ? parseFloat(data[0].fundingRate) : 0;
  } catch {
    return 0;
  }
}

export async function getTopPairs(limit = 20): Promise<string[]> {
  const res = await fetch('https://api.binance.com/api/v3/ticker/24hr');
  const tickers = await res.json();
  return tickers
    .filter((t: any) => t.symbol.endsWith('USDT'))
    .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
    .slice(0, limit)
    .map((t: any) => t.symbol);
}
EOF

# ============================================
# src/indicators/ema.ts
# ============================================
cat > src/indicators/ema.ts << 'EOF'
export function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length < period) return [];
  
  const k = 2 / (period + 1);
  const ema: number[] = [];
  
  // First EMA is SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  ema[period - 1] = sum / period;
  
  // Calculate rest
  for (let i = period; i < prices.length; i++) {
    ema[i] = prices[i] * k + ema[i - 1] * (1 - k);
  }
  
  return ema;
}

export function analyzeEMA(prices: number[]) {
  const ema9 = calculateEMA(prices, 9);
  const ema21 = calculateEMA(prices, 21);
  
  const current9 = ema9[ema9.length - 1];
  const current21 = ema21[ema21.length - 1];
  
  let trend = 'neutral';
  if (current9 > current21 * 1.01) trend = 'strong uptrend';
  else if (current9 > current21) trend = 'weak uptrend';
  else if (current9 < current21 * 0.99) trend = 'strong downtrend';
  else if (current9 < current21) trend = 'weak downtrend';
  
  return { ema9: current9, ema21: current21, trend };
}
EOF

# ============================================
# src/indicators/bollinger.ts
# ============================================
cat > src/indicators/bollinger.ts << 'EOF'
export function calculateBollinger(prices: number[], period = 20, stdDev = 2) {
  if (prices.length < period) {
    throw new Error('Not enough data for Bollinger Bands');
  }

  const sma = prices.slice(-period).reduce((a, b) => a + b) / period;
  
  const variance = prices.slice(-period)
    .reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
  const std = Math.sqrt(variance);
  
  const upper = sma + stdDev * std;
  const lower = sma - stdDev * std;
  const current = prices[prices.length - 1];
  
  // Position: -1 (lower) to 1 (upper)
  const position = (current - sma) / (std * stdDev);
  
  let signal = 'neutral';
  if (position > 0.8) signal = 'overbought';
  else if (position < -0.8) signal = 'oversold';
  
  return { upper, middle: sma, lower, position, signal };
}
EOF

# ============================================
# src/indicators/fibonacci.ts
# ============================================
cat > src/indicators/fibonacci.ts << 'EOF'
export function calculateFibonacci(prices: number[], lookback = 100) {
  const recent = prices.slice(-lookback);
  const high = Math.max(...recent);
  const low = Math.min(...recent);
  const range = high - low;
  const current = prices[prices.length - 1];
  
  const levels = {
    level_0: high,
    level_236: high - range * 0.236,
    level_382: high - range * 0.382,
    level_500: high - range * 0.5,
    level_618: high - range * 0.618,
    level_786: high - range * 0.786,
    level_1000: low
  };
  
  let currentLevel = 'Unknown';
  let signal = 'neutral';
  
  if (Math.abs(current - levels.level_618) / current < 0.01) {
    currentLevel = 'Near 61.8% (Golden Ratio)';
    signal = 'support';
  } else if (Math.abs(current - levels.level_382) / current < 0.01) {
    currentLevel = 'Near 38.2%';
    signal = 'resistance';
  } else if (current > levels.level_500) {
    currentLevel = 'Above 50% retracement';
    signal = 'resistance';
  } else {
    currentLevel = 'Below 50% retracement';
    signal = 'support';
  }
  
  return { levels, currentLevel, signal };
}
EOF

# ============================================
# src/models/transformerWorker.ts
# ============================================
cat > src/models/transformerWorker.ts << 'EOF'
interface MLInput {
  price: number;
  volume: number;
  ema9: number;
  ema21: number;
  fundingRate: number;
  bollingerPosition: number;
}

interface MLOutput {
  signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  reasoning: string;
}

export async function analyzeWithML(input: MLInput): Promise<MLOutput> {
  const HF_KEY = process.env.HUGGINGFACE_API_KEY;
  
  if (!HF_KEY) {
    return ruleBasedAnalysis(input);
  }

  try {
    const sentiment = await analyzeFinBERT(input);
    const techScore = calculateTechnicalScore(input);
    const finalScore = sentiment.score * 0.6 + techScore * 0.4;
    
    let signal: 'bullish' | 'bearish' | 'neutral';
    if (finalScore > 0.2) signal = 'bullish';
    else if (finalScore < -0.2) signal = 'bearish';
    else signal = 'neutral';
    
    return {
      signal,
      confidence: Math.abs(finalScore),
      reasoning: generateReasoning(input, sentiment, techScore)
    };
  } catch (error) {
    console.error('ML error:', error);
    return ruleBasedAnalysis(input);
  }
}

async function analyzeFinBERT(input: MLInput) {
  const context = `
    Price momentum: ${input.ema9 > input.ema21 ? 'positive' : 'negative'}.
    Funding: ${input.fundingRate > 0 ? 'bullish' : 'bearish'} at ${(input.fundingRate * 100).toFixed(3)}%.
    Bollinger: ${input.bollingerPosition > 0 ? 'upper band' : 'lower band'}.
  `;

  const res = await fetch(
    'https://api-inference.huggingface.co/models/ProsusAI/finbert',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: context }),
    }
  );

  if (!res.ok) throw new Error(`HF API error: ${res.status}`);
  
  const result = await res.json();
  const sentiment = result[0].reduce((max: any, curr: any) => 
    curr.score > max.score ? curr : max
  );
  
  const scoreMap: Record<string, number> = {
    'positive': 1, 'negative': -1, 'neutral': 0
  };
  
  return {
    score: scoreMap[sentiment.label.toLowerCase()] * sentiment.score,
    label: sentiment.label
  };
}

function calculateTechnicalScore(input: MLInput): number {
  let score = 0;
  if (input.ema9 > input.ema21) score += 0.4; else score -= 0.4;
  if (input.fundingRate > 0.01) score -= 0.3;
  else if (input.fundingRate < -0.01) score += 0.3;
  if (input.bollingerPosition < -0.8) score += 0.3;
  else if (input.bollingerPosition > 0.8) score -= 0.3;
  return Math.max(-1, Math.min(1, score));
}

function generateReasoning(input: MLInput, sentiment: any, techScore: number): string {
  const reasons: string[] = [];
  if (input.ema9 > input.ema21) reasons.push('Bullish EMA crossover');
  else reasons.push('Bearish EMA trend');
  if (Math.abs(input.fundingRate) > 0.01) {
    reasons.push(`${input.fundingRate > 0 ? 'High' : 'Negative'} funding`);
  }
  if (Math.abs(input.bollingerPosition) > 0.8) {
    reasons.push(`${input.bollingerPosition > 0 ? 'Overbought' : 'Oversold'}`);
  }
  reasons.push(`ML: ${sentiment.label}`);
  return reasons.join(' • ');
}

function ruleBasedAnalysis(input: MLInput): MLOutput {
  const score = calculateTechnicalScore(input);
  let signal: 'bullish' | 'bearish' | 'neutral';
  if (score > 0.3) signal = 'bullish';
  else if (score < -0.3) signal = 'bearish';
  else signal = 'neutral';
  
  return {
    signal,
    confidence: Math.abs(score),
    reasoning: 'Rule-based (no ML key)'
  };
}
EOF

# ============================================
# src/ForecastEngine.ts
# ============================================
cat > src/ForecastEngine.ts << 'EOF'
import { MarketData, ForecastResult } from './data/types';
import { analyzeEMA } from './indicators/ema';
import { calculateBollinger } from './indicators/bollinger';
import { calculateFibonacci } from './indicators/fibonacci';
import { analyzeWithML } from './models/transformerWorker';

export class ForecastEngine {
  async analyze(data: MarketData): Promise<ForecastResult> {
    const prices = data.ohlcv.map(c => c.close);
    
    // Technical indicators
    const ema = analyzeEMA(prices);
    const bollinger = calculateBollinger(prices);
    const fibonacci = calculateFibonacci(prices);
    
    // ML analysis
    const ml = await analyzeWithML({
      price: data.price,
      volume: data.volume24h,
      ema9: ema.ema9,
      ema21: ema.ema21,
      fundingRate: data.fundingRate,
      bollingerPosition: bollinger.position
    });
    
    // Determine overall signal
    const signals = [ml.signal];
    if (ema.ema9 > ema.ema21) signals.push('bullish');
    else signals.push('bearish');
    if (bollinger.signal === 'oversold') signals.push('bullish');
    else if (bollinger.signal === 'overbought') signals.push('bearish');
    
    const bullishCount = signals.filter(s => s === 'bullish').length;
    const bearishCount = signals.filter(s => s === 'bearish').length;
    
    let finalSignal: 'bullish' | 'bearish' | 'neutral';
    if (bullishCount > bearishCount) finalSignal = 'bullish';
    else if (bearishCount > bullishCount) finalSignal = 'bearish';
    else finalSignal = 'neutral';
    
    const confidence = Math.abs(bullishCount - bearishCount) / signals.length;
    
    return {
      symbol: data.symbol,
      price: data.price,
      signal: finalSignal,
      confidence,
      analysis: {
        ema,
        bollinger,
        fibonacci,
        fundingRate: data.fundingRate,
        ml
      },
      recommendation: this.generateRecommendation(finalSignal, confidence),
      timestamp: Date.now()
    };
  }
  
  private generateRecommendation(signal: string, confidence: number): string {
    if (confidence < 0.3) return 'Wait for clearer signals';
    if (signal === 'bullish') return 'Consider long positions';
    if (signal === 'bearish') return 'Consider short positions';
    return 'Hold current positions';
  }
}
EOF

# ============================================
# src/format/userMessage.ts
# ============================================
cat > src/format/userMessage.ts << 'EOF'
import { ForecastResult } from '../data/types';

export function formatUserMessage(forecast: ForecastResult): string {
  const emoji = {
    'bullish': '🟢',
    'bearish': '🔴',
    'neutral': '⚪'
  }[forecast.signal];
  
  const confidenceBar = '█'.repeat(Math.round(forecast.confidence * 10));
  
  return `
📊 <b>${forecast.symbol} Forecast</b>

💰 Price: $${forecast.price.toLocaleString()}
${emoji} Signal: <b>${forecast.signal.toUpperCase()}</b>
📈 Confidence: ${confidenceBar} ${(forecast.confidence * 100).toFixed(0)}%

<b>Technical Analysis:</b>
📉 EMA: ${forecast.analysis.ema.trend}
📊 Bollinger: ${forecast.analysis.bollinger.signal}
🎯 Fibonacci: ${forecast.analysis.fibonacci.currentLevel}
💸 Funding: ${(forecast.analysis.fundingRate * 100).toFixed(3)}%

🧠 <b>ML Analysis:</b>
${forecast.analysis.ml.reasoning}

💡 <b>Recommendation:</b> ${forecast.recommendation}

<i>⚠️ Not financial advice. DYOR!</i>
`.trim();
}
EOF

# ============================================
# api/forecast.ts
# ============================================
cat > api/forecast.ts << 'EOF'
import { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchBinanceData } from '../src/data/fetchBinance';
import { ForecastEngine } from '../src/ForecastEngine';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { symbol = 'BTCUSDT' } = req.query;
  
  try {
    const data = await fetchBinanceData(symbol as string);
    const engine = new ForecastEngine();
    const forecast = await engine.analyze(data);
    
    return res.status(200).json(forecast);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
EOF

# ============================================
# api/telegramWebhook.ts
# ============================================
cat > api/telegramWebhook.ts << 'EOF'
import { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchBinanceData } from '../src/data/fetchBinance';
import { ForecastEngine } from '../src/ForecastEngine';
import { formatUserMessage } from '../src/format/userMessage';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const update = req.body;

  if (update.message?.text) {
    await handleMessage(update.message);
  }

  if (update.callback_query) {
    await handleCallback(update.callback_query);
  }

  return res.status(200).json({ ok: true });
}

async function handleMessage(message: any) {
  const chatId = message.chat.id;
  const text = message.text || '';

  if (text.startsWith('/start')) {
    await sendWelcome(chatId);
  } else if (text.startsWith('/forecast')) {
    const symbol = text.split(' ')[1] || 'BTCUSDT';
    await sendForecast(chatId, symbol);
  } else {
    const symbol = text.replace(/[^a-zA-Z]/g, '').toUpperCase();
    if (symbol.length >= 3) {
      await sendForecast(chatId, symbol + 'USDT');
    }
  }
}

async function handleCallback(callback: any) {
  const chatId = callback.message.chat.id;
  
  await fetch(`${API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callback.id })
  });

  if (callback.data.startsWith('pair_')) {
    const symbol = callback.data.replace('pair_', '');
    await sendForecast(chatId, symbol);
  }
}

async function sendWelcome(chatId: number) {
  await sendMessage(chatId, `
🤖 <b>Welcome to ForecastBot!</b>

📊 Get AI-powered crypto forecasts

<b>Commands:</b>
/forecast BTC - Analyze BTC/USDT
Or just send: BTC, ETH, SOL

<b>Features:</b>
📈 EMA, Bollinger, Fibonacci
🧠 ML sentiment analysis  
💰 Funding rate tracking
`, {
    reply_markup: {
      inline_keyboard: [[
        { text: '📈 BTC', callback_data: 'pair_BTCUSDT' },
        { text: '📊 ETH', callback_data: 'pair_ETHUSDT' }
      ]]
    }
  });
}

async function sendForecast(chatId: number, symbol: string) {
  try {
    await fetch(`${API}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action: 'typing' })
    });

    const data = await fetchBinanceData(symbol);
    const engine = new ForecastEngine();
    const forecast = await engine.analyze(data);
    const message = formatUserMessage(forecast);

    await sendMessage(chatId, message, {
      reply_markup: {
        inline_keyboard: [[
          { text: '🔄 Refresh', callback_data: `pair_${symbol}` },
          { text: '📊 Chart', url: `https://www.binance.com/en/trade/${symbol}` }
        ]]
      }
    });
  } catch (error: any) {
    await sendMessage(chatId, `❌ Error: ${error.message}`);
  }
}

async function sendMessage(chatId: number, text: string, options: any = {}) {
  await fetch(`${API}/sendMessage`, {
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

# ============================================
# Configuration Files
# ============================================

cat > package.json << 'EOF'
{
  "name": "forecast-bot",
  "version": "2.0.0",
  "description": "AI-powered crypto market forecasting bot",
  "main": "index.js",
  "scripts": {
    "dev": "vercel dev",
    "build": "tsc",
    "deploy": "vercel --prod"
  },
  "dependencies": {
    "@vercel/node": "^3.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
EOF

cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*", "api/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

cat > vercel.json << 'EOF'
{
  "functions": {
    "api/*.ts": {
      "memory": 1024,
      "maxDuration": 10
    }
  },
  "env": {
    "TELEGRAM_BOT_TOKEN": "@telegram_bot_token",
    "HUGGINGFACE_API_KEY": "@huggingface_api_key"
  }
}
EOF

cat > .env.example << 'EOF'
# Telegram Bot Token (get from @BotFather)
TELEGRAM_BOT_TOKEN=1234567890:ABCdef...

# Hugging Face API Key (get from https://huggingface.co/settings/tokens)
HUGGINGFACE_API_KEY=hf_...

# Optional: Your Vercel URL
# VERCEL_URL=your-app.vercel.app
EOF

cat > .gitignore << 'EOF'
node_modules/
.env
.env.local
.vercel
dist/
*.log
backup-*/
EOF

cat > README.md << 'EOF'
# 🤖 ForecastBot v2.0

AI-powered cryptocurrency market forecasting bot.

## Features

- 📊 Technical Analysis (EMA, Bollinger Bands, Fibonacci)
- 🧠 ML Sentiment Analysis (Hugging Face FinBERT)
- 💰 Funding Rate Tracking (Binance Futures)
- 🤖 Telegram Bot Interface
- 🌐 REST API Endpoints

## Quick Start

### 1. Setup Telegram Bot

Message [@BotFather](https://t.me/BotFather):
```
/newbot
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env.local
# Edit .env.local with your tokens
```

### 4. Deploy to Vercel

```bash
npm install -g vercel
vercel login
vercel --prod
```

### 5. Set Webhook

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://your-app.vercel.app/api/telegramWebhook"
```

## API Usage

### Get Forecast

```bash
curl https://your-app.vercel.app/api/forecast?symbol=BTCUSDT
```

### Telegram Commands

- `/start` - Start bot
- `/forecast BTC` - Get BTC forecast
- Send symbol directly: `BTC`, `ETH`, `SOL`

## Development

```bash
# Run locally
npm run dev

# Test API
curl http://localhost:3000/api/forecast?symbol=ETHUSDT
```

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Deployment**: Vercel Serverless Functions
- **Data**: Binance API
- **ML**: Hugging Face Inference API
- **Bot**: Telegram Bot API

## License

MIT
EOF

# ============================================
# STEP 4: Install Dependencies
# ============================================
echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "✅ ForecastBot v2.0 Rebuild Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. cp .env.example .env.local"
echo "2. Add your TELEGRAM_BOT_TOKEN and HUGGINGFACE_API_KEY"
echo "3. npm run dev (test locally)"
echo "4. vercel --prod (deploy)"
echo ""
echo "📁 File structure:"
tree -L 2 -I 'node_modules|backup-*'
