// src/pages/SelectPair.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SelectPair() {
  const [pair, setPair] = useState("BTC-USDT");
  const navigate = useNavigate();

  return (
    <div className="select">
      <h2>Select Pair</h2>
      <select value={pair} onChange={(e) => setPair(e.target.value)}>
        <option>BTC-USDT</option>
        <option>ETH-USDT</option>
        <option>SOL-USDT</option>
      </select>
      <button onClick={() => navigate(`/forecast?pair=${pair}`)}>FORECAST</button>
    </div>
  );
}
