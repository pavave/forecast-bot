export function getQuantileRange(candles: any[], quantiles: number[]): [number, number] {
  const prices = candles.map(c => c.close).sort((a, b) => a - b);
  const q = (p: number) => prices[Math.floor(p * prices.length)];
  return [q(quantiles[0]), q(quantiles[1])];
}

