"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForecastEngine = void 0;
const ema_1 = require("./indicators/ema");
const bollinger_1 = require("./indicators/bollinger");
const fibonacci_1 = require("./indicators/fibonacci");
const transformerWorker_1 = require("./models/transformerWorker");
class ForecastEngine {
    async analyze(data) {
        const prices = data.ohlcv.map(c => c.close);
        // Technical indicators
        const ema = (0, ema_1.analyzeEMA)(prices);
        const bollinger = (0, bollinger_1.calculateBollinger)(prices);
        const fibonacci = (0, fibonacci_1.calculateFibonacci)(prices);
        // ML analysis
        const ml = await (0, transformerWorker_1.analyzeWithML)({
            price: data.price,
            volume: data.volume24h,
            ema9: ema.ema9,
            ema21: ema.ema21,
            fundingRate: data.fundingRate,
            bollingerPosition: bollinger.position
        });
        // Determine overall signal
        const signals = [ml.signal];
        if (ema.ema9 > ema.ema21)
            signals.push('bullish');
        else
            signals.push('bearish');
        if (bollinger.signal === 'oversold')
            signals.push('bullish');
        else if (bollinger.signal === 'overbought')
            signals.push('bearish');
        const bullishCount = signals.filter(s => s === 'bullish').length;
        const bearishCount = signals.filter(s => s === 'bearish').length;
        let finalSignal;
        if (bullishCount > bearishCount)
            finalSignal = 'bullish';
        else if (bearishCount > bullishCount)
            finalSignal = 'bearish';
        else
            finalSignal = 'neutral';
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
    generateRecommendation(signal, confidence) {
        if (confidence < 0.3)
            return 'Wait for clearer signals';
        if (signal === 'bullish')
            return 'Consider long positions';
        if (signal === 'bearish')
            return 'Consider short positions';
        return 'Hold current positions';
    }
}
exports.ForecastEngine = ForecastEngine;
