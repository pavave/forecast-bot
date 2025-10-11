export function getFibonacciLevels(candles: any[]): [number, number] {
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const max = Math.max(...highs);
  const min = Math.min(...lows);
  const support = min + (max - min) * 0.618;
  const resistance = min + (max - min) * 0.786;
  return [parseFloat(support.toFixed(2)), parseFloat(resistance.toFixed(2))];
}

