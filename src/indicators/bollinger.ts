export function calculateBollinger(prices: number[], period = 20, stdDev = 2) {
  if (prices.length < period) {
    throw new Error(`Not enough data for Bollinger Bands: need ${period}, got ${prices.length}`);
  }

  const recent = prices.slice(-period);
  const sma = recent.reduce((a, b) => a + b, 0) / period;

  const variance = recent.reduce((sum, price) => sum + (price - sma) ** 2, 0) / period;
  const std = Math.sqrt(variance);

  const upper = sma + stdDev * std;
  const lower = sma - stdDev * std;
  const current = prices[prices.length - 1];

  const position = (current - sma) / (std * stdDev); // normalized position

  let signal: 'overbought' | 'oversold' | 'neutral' = 'neutral';
  if (position > 0.8) signal = 'overbought';
  else if (position < -0.8) signal = 'oversold';

  return {
    upper,
    middle: sma,
    lower,
    position: Math.max(-1, Math.min(1, position)), // clamp for safety
    signal
  };
}
