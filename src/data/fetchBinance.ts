import { MarketData } from './types';

export async function fetchBinanceData(
  symbol: string = 'BTCUSDT',
  interval: string = '1h',
  limit: number = 100
): Promise<MarketData> {
  const normalized = symbol.replace(/[-_]/g, '').toUpperCase();
  
  const [ticker, klines, funding] = await Promise.all([
    fetch24hTicker(normalized),
    fetchKlines(normalized, interval, limit),
    fetchFundingRate(normalized)
  ]);

  return {
    symbol: normalized,
    price: parseFloat((ticker as any).lastPrice),
    volume24h: parseFloat((ticker as any).volume),
    priceChange24h: parseFloat((ticker as any).priceChangePercent),
    fundingRate: funding,
    ohlcv: (klines as any[]).map((k: any[]) => ({
      time: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5])
    }))
  };
}

async function fetch24hTicker(symbol: string): Promise<any> {
  const res = await fetch(
    `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`
  );
  if (!res.ok) throw new Error(`Binance API error: ${res.status}`);
  return res.json();
}

async function fetchKlines(symbol: string, interval: string, limit: number): Promise<any> {
  const res = await fetch(
    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
  );
  if (!res.ok) throw new Error(`Klines error: ${res.status}`);
  return res.json();
}

async function fetchFundingRate(symbol: string): Promise<number> {
  try {
    const res = await fetch(
      `https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&limit=1`
    );
    if (!res.ok) return 0;
    const data: any = await res.json();
    return data.length > 0 ? parseFloat(data[0].fundingRate) : 0;
  } catch {
    return 0;
  }
}

export async function getTopPairs(limit = 20): Promise<string[]> {
  const res = await fetch('https://api.binance.com/api/v3/ticker/24hr');
  const tickers: any = await res.json();
  return tickers
    .filter((t: any) => t.symbol.endsWith('USDT'))
    .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
    .slice(0, limit)
    .map((t: any) => t.symbol);
}
