import { fetchBinanceOHLCV } from "./data/fetchBinance";
import { getEMA } from "./indicators/ema";
import { getQuantileRange } from "./indicators/quantile";
import { getFibonacciLevels } from "./indicators/fibonacci";
import { elliottWavePhase } from "./indicators/elliott";
import { getBollingerBands } from "./indicators/bollinger";
import { transformerWorker } from "./models/transformerWorker";
import { formatForecastMessage } from "./format/userMessage";

export class ForecastEngine {
  async run(pair: string): Promise<string> {
    const candles = await fetchBinanceOHLCV(pair, "1d");

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

    const transformerHint = transformerWorker({
      price: candles[candles.length - 1].close,
      volume: candles[candles.length - 1].volume,
      fundingRate: 0.012, // заміни на реальний з EVEDEX або CoinGecko
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
    });
  }
}
