import { ForecastEngine } from "../ForecastEngine";

export default async function handler(req, res) {
  const body = req.body;

  if (!body?.message?.text) return res.status(200).end();

  const pair = body.message.text.trim().toUpperCase();
  const forecastEngine = new ForecastEngine();
  const forecastText = await forecastEngine.run(pair);

  const priceMatch = forecastText.match(/Current price: \$(\d+[\.\d]*)/);
  const trendMatch = forecastText.match(/Trend: (.+)/);
  const rangeMatch = forecastText.match(/Expected range \(24h\): \$(.+) – \$(.+)/);

  const price = priceMatch?.[1] || "";
  const trend = trendMatch?.[1] || "";
  const range = rangeMatch ? `$${rangeMatch[1]} – $${rangeMatch[2]}` : "";

  const ogUrl = `https://your-vercel-app.vercel.app/api/og-image?pair=${encodeURIComponent(pair)}&price=${encodeURIComponent(price)}&trend=${encodeURIComponent(trend)}&range=${encodeURIComponent(range)}`;

  const fullMessage = `${forecastText}\n\n🔗 ${ogUrl}`;

  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: body.message.chat.id,
      text: fullMessage,
    }),
  });

  res.status(200).end();
}
