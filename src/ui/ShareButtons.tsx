export const ShareButtons = ({ forecastText }: { forecastText: string }) => (
  <div>
    <button onClick={() => fetch("/api/shareFarcaster", {
      method: "POST",
      body: JSON.stringify({ forecastText }),
      headers: { "Content-Type": "application/json" },
    })}>Share to Farcaster</button>

    <button onClick={() => fetch("/api/shareTwitter", {
      method: "POST",
      body: JSON.stringify({ forecastText }),
      headers: { "Content-Type": "application/json" },
    })}>Share to X</button>
  </div>
);

