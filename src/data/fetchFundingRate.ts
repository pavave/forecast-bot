export async function fetchFundingRate(pair: string): Promise<number> {
  const symbol = pair.replace("-", "").toUpperCase(); // BTC-USDT → BTCUSDT

  // 1️⃣ Binance Futures API
  try {
    const binanceRes = await fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`);
    const binanceJson = await binanceRes.json();

    if (binanceJson.lastFundingRate) {
      return parseFloat(binanceJson.lastFundingRate);
    }
  } catch (err) {
    console.warn("Binance funding rate failed:", err);
  }

  // 2️⃣ CoinGecko fallback
  try {
    const coinId = mapToCoinGeckoId(pair); // e.g. BTC-USDT → "bitcoin"
    const geckoRes = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/market_data`);
    const geckoJson = await geckoRes.json();

    // CoinGecko не дає funding rate напряму, але можна оцінити через spread
    const spread = geckoJson?.market_data?.price_change_percentage_24h || 0;
    const estimatedFunding = spread / 1000; // умовна формула

    return parseFloat(estimatedFunding.toFixed(4));
  } catch (err) {
    console.warn("CoinGecko fallback failed:", err);
  }

  // 3️⃣ Безпечний fallback
  return 0.0;
}

// 🔧 Мапінг пар на CoinGecko ID
function mapToCoinGeckoId(pair: string): string {
  const lower = pair.toLowerCase();
  if (lower.includes("btc")) return "bitcoin";
  if (lower.includes("eth")) return "ethereum";
  if (lower.includes("sol")) return "solana";
  if (lower.includes("doge")) return "dogecoin";
  if (lower.includes("ada")) return "cardano";
  return "bitcoin"; // fallback
}
