export function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length < period) return [];

  const k = 2 / (period + 1);
  const ema: number[] = [];

  // First EMA is SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  ema[period - 1] = sum / period;

  // Calculate rest
  let prevEMA = ema[period - 1];
  for (let i = period; i < prices.length; i++) {
    const currentEMA = prices[i] * k + prevEMA * (1 - k);
    ema[i] = currentEMA;
    prevEMA = currentEMA;
  }

  return ema.slice(period - 1);
}

export function analyzeEMA(prices: number[]) {
  const ema9 = calculateEMA(prices, 9);
  const ema21 = calculateEMA(prices, 21);

  const current9 = ema9[ema9.length - 1];
  const current21 = ema21[ema21.length - 1];

  let trend = 'neutral';
  if (current9 > current21 * 1.01) trend = 'strong uptrend';
  else if (current9 > current21) trend = 'weak uptrend';
  else if (current9 < current21 * 0.99) trend = 'strong downtrend';
  else if (current9 < current21) trend = 'weak downtrend';

  return { ema9: current9, ema21: current21, trend };
}
