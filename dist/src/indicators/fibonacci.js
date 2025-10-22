"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateFibonacci = calculateFibonacci;
function calculateFibonacci(prices, lookback = 100) {
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
    }
    else if (Math.abs(current - levels.level_382) / current < 0.01) {
        currentLevel = 'Near 38.2%';
        signal = 'resistance';
    }
    else if (current > levels.level_500) {
        currentLevel = 'Above 50% retracement';
        signal = 'resistance';
    }
    else {
        currentLevel = 'Below 50% retracement';
        signal = 'support';
    }
    return { levels, currentLevel, signal };
}
