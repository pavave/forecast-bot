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
