import ccxt from "ccxt";

export async function fetchBinanceOHLCV(pair: string, timeframe = "1d", since?: number) {
  const binance = new ccxt.binance();
  const ohlcv = await binance.fetchOHLCV(pair, timeframe, since);
  return ohlcv.map(([timestamp, open, high, low, close, volume]) => ({
    timestamp, open, high, low, close, volume,
  }));
}

