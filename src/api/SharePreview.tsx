import { useState } from "react";

export const SharePreview = ({
  pair,
  price,
  trend,
  range,
  forecastText,
}: {
  pair: string;
  price: string;
  trend: string;
  range: string;
  forecastText: string;
}) => {
  const [copied, setCopied] = useState(false);

  const ogUrl = `https://forecast-bot.vercel.app/api/og-image?pair=${encodeURIComponent(pair)}&price=${encodeURIComponent(price)}&trend=${encodeURIComponent(trend)}&range=${encodeURIComponent(range)}`;

  const fullText = `${forecastText}\n\n🔗 ${ogUrl}`;

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ border: "1px solid #ccc", padding: "1rem", borderRadius: "8px" }}>
      <img
        src={ogUrl}
        alt="Forecast Preview"
        style={{ width: "100%", maxWidth: "600px", borderRadius: "8px" }}
      />
      <button
        onClick={copyToClipboard}
        style={{
          marginTop: "1rem",
          padding: "0.5rem 1rem",
          backgroundColor: "#007bff",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        {copied ? "✅ Copied!" : "📋 Copy Forecast"}
      </button>
    </div>
  );
};
