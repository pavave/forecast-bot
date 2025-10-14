export async function fetchFundingRateFromBinance(pair: string): Promise<number> {
  const symbol = pair.replace("-", "").toUpperCase(); // BTC-USDT → BTCUSDT
  const url = `https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`;

  try {
    const res = await fetch(url);
    const json = await res.json();
    return parseFloat(json.lastFundingRate);
  } catch (err) {
    console.error("Funding rate fetch failed:", err);
    return 0.0; // fallback
  }
}
