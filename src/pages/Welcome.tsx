// src/pages/Welcome.tsx
import { useNavigate } from "react-router-dom";
import "./Welcome.css";

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="welcome">
      <img src="/assets/forecast-banner.jpeg" alt="Forecast Banner" className="banner" />
      <button onClick={() => navigate("/select")} className="start-button">START</button>
    </div>
  );
}
