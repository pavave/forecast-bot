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
