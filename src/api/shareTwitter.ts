import fetch from "node-fetch";

export default async function handler(req, res) {
  const { forecastText, pair, price, trend, range } = req.body;
  const bearerToken = process.env.TWITTER_BEARER;

  const ogUrl = `https://your-vercel-app.vercel.app/api/og-image?pair=${encodeURIComponent(pair)}&price=${encodeURIComponent(price)}&trend=${encodeURIComponent(trend)}&range=${encodeURIComponent(range)}`;

  const tweetText = `${forecastText}\n\n🔗 ${ogUrl}`;

  const response = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: tweetText }),
  });

  const data = await response.json();
  res.status(200).json(data);
}
