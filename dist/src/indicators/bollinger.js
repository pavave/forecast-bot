"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateBollinger = calculateBollinger;
function calculateBollinger(prices, period = 20, stdDev = 2) {
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
    if (position > 0.8)
        signal = 'overbought';
    else if (position < -0.8)
        signal = 'oversold';
    return { upper, middle: sma, lower, position, signal };
}
