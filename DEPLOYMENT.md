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
