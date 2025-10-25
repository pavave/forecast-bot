import { fetchBinanceOHLCV } from "./data/fetchBinance";
import { fetchFundingRateFromBinance } from "./data/fetchFundingRate";
import { getEMA } from "./indicators/ema";
import { getQuantileRange } from "./indicators/quantile";
import { getFibonacciLevels } from "./indicators/fibonacci";
import { elliottWavePhase } from "./indicators/elliott";
import { getBollingerBands } from "./indicators/bollinger";
import { transformerWorker } from "./models/transformerWorker";
import { formatForecastMessage } from "./format/userMessage";
import { MarketData, ForecastResult } from './data/types';
import { analyzeEMA } from './indicators/ema';
import { calculateBollinger } from './indicators/bollinger';
import { calculateFibonacci } from './indicators/fibonacci';
import { analyzeWithML } from './models/transformerWorker';


type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export class ForecastEngine {
  async run(pair: string): Promise<string> {
    const candles: Candle[] = await fetchBinanceOHLCV(pair, "1d");

    const ema9 = getEMA(candles, 9);
    const ema21 = getEMA(candles, 21);
    const trend = ema9 > ema21 ? "Weak uptrend (EMA 9 > EMA 21)" : "Downtrend (EMA 9 < EMA 21)";

    const quantile = getQuantileRange(candles, [0.25, 0.75]);
    const fibonacci = getFibonacciLevels(candles);
    const elliott = elliottWavePhase(candles);
    const bollinger = getBollingerBands(candles);

    const volatilityHint =
      bollinger.upper - bollinger.lower < 0.01 * bollinger.middle
        ? "Low volatility — breakout likely"
        : "Wide bands — high volatility";

    const fundingRate = await fetchFundingRateFromBinance(pair); // ✅ пункт 1

    const transformerHint = await transformerWorker({ // ✅ пункт 2
      price: candles[candles.length - 1].close,
      volume: candles[candles.length - 1].volume,
      fundingRate,
      emaTrend: trend,
      elliottPhase: elliott,
    });

    return formatForecastMessage({
      pair,
      currentPrice: candles[candles.length - 1].close,
      trend,
      quantile,
      fibonacci,
      elliott,
      bollinger,
      volatilityHint,
      transformerHint,

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
