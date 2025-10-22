import { ForecastEngine } from "../ForecastEngine";

export default async function handler(req, res) {
  const { pair } = req.query;
  const forecast = await new ForecastEngine().run(pair);
  res.status(200).json({ forecast });
}

