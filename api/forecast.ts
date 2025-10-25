import { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchBinanceData } from '../src/data/fetchBinance';
import { ForecastEngine } from '../src/ForecastEngine';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { symbol = 'BTCUSDT' } = req.query;
  
  try {
    const data = await fetchBinanceData(symbol as string);
    const engine = new ForecastEngine();
    const forecast = await engine.analyze(data);
    
    return res.status(200).json(forecast);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
