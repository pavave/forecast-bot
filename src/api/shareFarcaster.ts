export default function handler(req, res) {
  const { forecastText, pair, price, trend, range } = req.body;

  const ogUrl = `https://your-vercel-app.vercel.app/api/og-image?pair=${encodeURIComponent(pair)}&price=${encodeURIComponent(price)}&trend=${encodeURIComponent(trend)}&range=${encodeURIComponent(range)}`;

  res.setHeader("Content-Type", "text/html");
  res.status(200).send(`
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${ogUrl}" />
        <meta property="fc:frame:button:1" content="Share Forecast" />
        <meta property="fc:frame:post_url" content="https://your-vercel-app.vercel.app/api/shareFarcaster" />
        <meta property="og:title" content="Crypto Forecast" />
        <meta property="og:description" content="${forecastText}" />
      </head>
      <body>
        <h1>Forecast Shared</h1>
      </body>
    </html>
  `);
}
