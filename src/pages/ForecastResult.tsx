import { useEffect, useState } from "react";

export default function ForecastResult() {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchForecast = async () => {
      try {
        const res = await fetch("/api/forecast?symbol=BTCUSDT");
        const data = await res.json();
        setForecast(data);
      } catch (err) {
        setError("Failed to load forecast");
      } finally {
        setLoading(false);
      }
    };
    fetchForecast();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;
  if (!forecast) return <div>No data</div>;

  return (
    <div>
      <h2>{forecast.symbol}</h2>
      <p>Price: ${forecast.price}</p>
      <p>Signal: {forecast.signal}</p>
      <p>Confidence: {(forecast.confidence * 100).toFixed(1)}%</p>
      <p>{forecast.recommendation}</p>
    </div>
  );
}
