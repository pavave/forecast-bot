"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const fetchBinance_1 = require("../src/data/fetchBinance");
const ForecastEngine_1 = require("../src/ForecastEngine");
const userMessage_1 = require("../src/format/userMessage");
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;
async function handler(req, res) {
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
async function handleMessage(message) {
    const chatId = message.chat.id;
    const text = message.text || '';
    if (text.startsWith('/start')) {
        await sendWelcome(chatId);
    }
    else if (text.startsWith('/forecast')) {
        const symbol = text.split(' ')[1] || 'BTCUSDT';
        await sendForecast(chatId, symbol);
    }
    else {
        const symbol = text.replace(/[^a-zA-Z]/g, '').toUpperCase();
        if (symbol.length >= 3) {
            await sendForecast(chatId, symbol + 'USDT');
        }
    }
}
async function handleCallback(callback) {
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
async function sendWelcome(chatId) {
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
async function sendForecast(chatId, symbol) {
    try {
        await fetch(`${API}/sendChatAction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, action: 'typing' })
        });
        const data = await (0, fetchBinance_1.fetchBinanceData)(symbol);
        const engine = new ForecastEngine_1.ForecastEngine();
        const forecast = await engine.analyze(data);
        const message = (0, userMessage_1.formatUserMessage)(forecast);
        await sendMessage(chatId, message, {
            reply_markup: {
                inline_keyboard: [[
                        { text: '🔄 Refresh', callback_data: `pair_${symbol}` },
                        { text: '📊 Chart', url: `https://www.binance.com/en/trade/${symbol}` }
                    ]]
            }
        });
    }
    catch (error) {
        await sendMessage(chatId, `❌ Error: ${error.message}`);
    }
}
async function sendMessage(chatId, text, options = {}) {
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
