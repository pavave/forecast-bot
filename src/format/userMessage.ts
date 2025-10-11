export function formatForecastMessage({
  pair, currentPrice, trend, quantile, fibonacci, elliott
}: {
  pair: string;
  currentPrice: number;
  trend: string;
  quantile: [number, number];
  fibonacci: [number, number];
  elliott: string;
}): string {
  return `🔮 Forecast for ${pair}:
- Current price: $${currentPrice}
- Trend: ${trend}
- Expected range (24h): $${quantile[0]} – $${quantile[1]}
- Fibonacci support zone: $${fibonacci[0]} – $${fibonacci[1]}
- Elliott: ${elliott}`;
}

