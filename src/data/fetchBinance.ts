// src/data/fetchBinance.ts
// Fetch real-time data from Binance Spot + Futures

interface BinanceKline {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
}

interface FundingRateData {
  symbol: string;
  fundingRate: string;
  fundingTime: number;
}

export interface BinanceMarketData {
  symbol: string;
  price: number;
  volume24h: number;
  priceChange24h: number;
  fundingRate: number;
  ohlcv: Array<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

/**
 * Fetch current market data for a symbol
 */
export async function fetchBinanceData(
  symbol: string = 'BTCUSDT',
  interval: string = '1h',
  limit: number = 100
): Promise<BinanceMarketData> {
  try {
    // Normalize symbol (remove hyphens, uppercase)
    const normalizedSymbol = symbol.replace('-', '').toUpperCase();
    
    // Fetch spot price + 24h stats
    const ticker24h = await fetch24hTicker(normalizedSymbol);
    
    // Fetch historical OHLCV
    const klines = await fetchKlines(normalizedSymbol, interval, limit);
    
    // Fetch funding rate (futures)
    const fundingRate = await fetchFundingRate(normalizedSymbol);
    
    return {
      symbol: normalizedSymbol,
      price: parseFloat(ticker24h.lastPrice),
      volume24h: parseFloat(ticker24h.volume),
      priceChange24h: parseFloat(ticker24h.priceChangePercent),
      fundingRate,
      ohlcv: klines.map(k => ({
        time: k.openTime,
        open: parseFloat(k.open),
        high: parseFloat(k.high),
        low: parseFloat(k.low),
        close: parseFloat(k.close),
        volume: parseFloat(k.volume)
      }))
    };
  } catch (error) {
    console.error('Binance fetch error:', error);
    throw new Error(`Failed to fetch data for ${symbol}`);
  }
}

async function fetch24hTicker(symbol: string) {
  const response = await fetch(
    `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`,
    { next: { revalidate: 60 } } // Cache for 1 minute
  );
  
  if (!response.ok) {
    throw new Error(`Binance API error: ${response.status}`);
  }
  
  return response.json();
}

async function fetchKlines(
  symbol: string,
  interval: string,
  limit: number
): Promise<BinanceKline[]> {
  const response = await fetch(
    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    { next: { revalidate: 300 } } // Cache for 5 minutes
  );
  
  if (!response.ok) {
    throw new Error(`Binance klines error: ${response.status}`);
  }
  
  const data = await response.json();
  
  return data.map((k: any[]) => ({
    openTime: k[0],
    open: k[1],
    high: k[2],
    low: k[3],
    close: k[4],
    volume: k[5],
    closeTime: k[6]
  }));
}

export async function fetchFundingRate(symbol: string): Promise<number> {
  try {
    // Binance Futures endpoint
    const response = await fetch(
      `https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&limit=1`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );
    
    if (!response.ok) {
      // If futures pair doesn't exist, return 0
      return 0;
    }
    
    const data: FundingRateData[] = await response.json();
    
    if (data.length === 0) return 0;
    
    return parseFloat(data[0].fundingRate);
  } catch (error) {
    console.warn('Funding rate not available:', error);
    return 0;
  }
}

/**
 * Get list of top trading pairs by volume
 */
export async function getTopPairs(limit: number = 20): Promise<string[]> {
  const response = await fetch(
    'https://api.binance.com/api/v3/ticker/24hr',
    { next: { revalidate: 3600 } }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch top pairs');
  }
  
  const tickers = await response.json();
  
  // Filter USDT pairs, sort by volume
  return tickers
    .filter((t: any) => t.symbol.endsWith('USDT'))
    .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
    .slice(0, limit)
    .map((t: any) => t.symbol);
}
