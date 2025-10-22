"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchBinanceData = fetchBinanceData;
exports.getTopPairs = getTopPairs;
async function fetchBinanceData(symbol = 'BTCUSDT', interval = '1h', limit = 100) {
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
        ohlcv: klines.map((k) => ({
            time: k[0],
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5])
        }))
    };
}
async function fetch24hTicker(symbol) {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
    if (!res.ok)
        throw new Error(`Binance API error: ${res.status}`);
    return res.json();
}
async function fetchKlines(symbol, interval, limit) {
    const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
    if (!res.ok)
        throw new Error(`Klines error: ${res.status}`);
    return res.json();
}
async function fetchFundingRate(symbol) {
    try {
        const res = await fetch(`https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&limit=1`);
        if (!res.ok)
            return 0;
        const data = await res.json();
        return data.length > 0 ? parseFloat(data[0].fundingRate) : 0;
    }
    catch {
        return 0;
    }
}
async function getTopPairs(limit = 20) {
    const res = await fetch('https://api.binance.com/api/v3/ticker/24hr');
    const tickers = await res.json();
    return tickers
        .filter((t) => t.symbol.endsWith('USDT'))
        .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
        .slice(0, limit)
        .map((t) => t.symbol);
}
