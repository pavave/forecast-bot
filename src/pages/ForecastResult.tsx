// src/pages/ForecastResult.tsx
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

export default function ForecastResult() {
  const [searchParams] = useSearchParams();
  const pair = searchParams.get("pair") || "BTC-USDT";
  const [result, setResult] = useState("");

  useEffect(() => {
    fetch(`/api/forecast?pair=${pair}`)
      .then((res) => res.text())
      .then(setResult);
  }, [pair]);

  return (
    <div className="result">
      <h2>Forecast for {pair}</h2>
      <pre>{result}</pre>
      <button onClick={() => navigator.clipboard.writeText(result)}>Copy</button>
    </div>
  );
}
