export function transformerWorker({
  price,
  volume,
  fundingRate,
  emaTrend,
  elliottPhase,
}: {
  price: number;
  volume: number;
  fundingRate: number;
  emaTrend: string;
  elliottPhase: string;
}): string {
  const bullish =
    fundingRate > 0.01 &&
    emaTrend.includes("uptrend") &&
    elliottPhase.includes("impulse");

  const bearish =
    fundingRate < -0.01 &&
    emaTrend.includes("downtrend") &&
    elliottPhase.includes("correction");

  if (bullish) return "Strong bullish setup — breakout likely";
  if (bearish) return "Bearish pressure — correction expected";
  return "Neutral setup — wait for confirmation";
}

