import fetch from "node-fetch";

export default async function handler(req, res) {
  const { forecastText } = req.body;
  const bearerToken = process.env.TWITTER_BEARER;

  const response = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: forecastText }),
  });

  const data = await response.json();
  res.status(200).json(data);
}

