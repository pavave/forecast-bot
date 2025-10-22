export function getBollingerBands(candles: any[], period: number = 20, multiplier: number = 2): {
  upper: number;
  middle: number;
  lower: number;
} {
  const closes = candles.map(c => c.close);
  const recent = closes.slice(-period);
  const mean = recent.reduce((sum, val) => sum + val, 0) / period;

  const variance = recent.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  const upper = mean + multiplier * stdDev;
  const lower = mean - multiplier * stdDev;

  return {
    upper: parseFloat(upper.toFixed(2)),
    middle: parseFloat(mean.toFixed(2)),
    lower: parseFloat(lower.toFixed(2)),
  };
}

