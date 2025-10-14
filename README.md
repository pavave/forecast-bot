# 🔮 Forecast Bot

A crypto forecasting bot that analyzes technical indicators (EMA, Bollinger Bands, Fibonacci, Elliott Waves, Quantiles) and generates shareable predictions for any trading pair. Users can copy forecasts and share them manually via Telegram, Farcaster, X (Twitter), or anywhere else.

## 🚀 Features

- 📊 Technical analysis using OHLCV data from Binance
- 🧠 Transformer-based signal hints
- 🖼 OG-image preview for Farcaster Frames, X, and Telegram
- 📋 "Copy Forecast" button for easy sharing
- 🧑‍💻 Telegram bot integration
- ⚡️ Vercel-ready deployment

---

## 🧑‍💻 Developer Setup

### 1. Clone the repo

```bash
git clone https://github.com/pavave/forecast-bot.git
cd forecast-bot
```
### 2. Install dependencies

```bash
pnpm install
```

If you don’t have pnpm installed:

```bash
npm install -g pnpm
```

### 3. Create environment file

```bash
cp .env.local.example .env.local
```

Fill in your Telegram bot token:

```bash
TELEGRAM_TOKEN=your_telegram_bot_token
PYTHON_PATH=/usr/bin/python3 # optional, if using Prophet
```

## 🔧 Local Development

```bash
vercel dev
```

Visit: http://localhost:3000

## 🚀 Deploy to Vercel

```bash
vercel --prod
```

## 🤖 Telegram Bot Setup
1. Create a bot via BotFather
2. Get your token and paste it into .env.local
3. Set the webhook:

```bash
curl "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=https://your-vercel-app.vercel.app/api/telegramWebhook"
```

Now users can message your bot with a pair like BTC-USDC and receive a forecast.

## 📦 Dependencies

```bash
{
  "ccxt": "^4.1.89",
  "node-fetch": "^3.3.2",
  "vercel": "^28.18.0",
  "typescript": "^5.x",
  "react": "^18.x",
  "next": "^13.x",
  "zod": "^3.x"
}
```

All dependencies are managed via pnpm. See package.json for full list.

## 🧠 Author
Built by pavave — blending technical precision with meme-driven UX for viral crypto tools.
