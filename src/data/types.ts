// Core data types for ForecastBot

export interface MarketData {
  symbol: string;
  price: number;
  volume24h: number;
  priceChange24h: number;
  fundingRate: number;
  ohlcv: OHLCV[];
}

export interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ForecastResult {
  symbol: string;
  price: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  analysis: {
    ema: {
      ema9: number;
      ema21: number;
      trend: string;
    };
    bollinger: {
      upper: number;
      middle: number;
      lower: number;
      position: number;
      signal: string;
    };
    fibonacci: {
      currentLevel: string;
      signal: string;
    };
    fundingRate: number;
    ml: {
      signal: string;
      confidence: number;
      reasoning: string;
    };
  };
  recommendation: string;
  timestamp: number;
}
