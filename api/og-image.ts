import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const config = {
  runtime: "edge",
};

export default function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pair = searchParams.get("pair") || "BTC-USDC";
  const price = searchParams.get("price") || "$27,420";
  const trend = searchParams.get("trend") || "Weak uptrend";
  const range = searchParams.get("range") || "$26,900 – $28,100";

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 42,
          background: "black",
          color: "white",
          width: "100%",
          height: "100%",
          padding: "60px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div style={{ fontSize: 60, marginBottom: 20 }}>🔮 {pair} Forecast</div>
        <div>Price: {price}</div>
        <div>Trend: {trend}</div>
        <div>Range: {range}</div>
        <div style={{ marginTop: 40, fontSize: 28, color: "#888" }}>
          forecast-bot.vercel.app
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

