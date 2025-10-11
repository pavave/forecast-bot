export function elliottWavePhase(candles: any[]): string {
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const range = Math.max(...highs) - Math.min(...lows);
  if (range < 0.05 * highs[highs.length - 1]) return "Wave 4 → impulse expected";
  return "Wave B → correction likely";
}

