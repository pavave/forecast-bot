import fetch from "node-fetch";

export async function fetchCoinGeckoOHLCV(id: string, days = 30) {
  const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.prices.map(([timestamp, price]) => ({ timestamp, close: price }));
}

