import { ForecastEngine } from "../ForecastEngine";

export default async function handler(req, res) {
  const body = req.body;

  if (!body?.message?.text) return res.status(200).end();

  const pair = body.message.text.trim().toUpperCase();
  const forecast = await new ForecastEngine().run(pair);

  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: body.message.chat.id,
      text: forecast,
    }),
  });

  res.status(200).end();
}

