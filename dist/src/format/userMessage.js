"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatUserMessage = formatUserMessage;
function formatUserMessage(forecast) {
    const emoji = {
        'bullish': '🟢',
        'bearish': '🔴',
        'neutral': '⚪'
    }[forecast.signal];
    const confidenceBar = '█'.repeat(Math.round(forecast.confidence * 10));
    return `
📊 <b>${forecast.symbol} Forecast</b>

💰 Price: $${forecast.price.toLocaleString()}
${emoji} Signal: <b>${forecast.signal.toUpperCase()}</b>
📈 Confidence: ${confidenceBar} ${(forecast.confidence * 100).toFixed(0)}%

<b>Technical Analysis:</b>
📉 EMA: ${forecast.analysis.ema.trend}
📊 Bollinger: ${forecast.analysis.bollinger.signal}
🎯 Fibonacci: ${forecast.analysis.fibonacci.currentLevel}
💸 Funding: ${(forecast.analysis.fundingRate * 100).toFixed(3)}%

🧠 <b>ML Analysis:</b>
${forecast.analysis.ml.reasoning}

💡 <b>Recommendation:</b> ${forecast.recommendation}

<i>⚠️ Not financial advice. DYOR!</i>
`.trim();
}

export function formatForecastMessage(data: {
  pair: string;
  currentPrice: number;
  trend: string;
  fibonacci: any;
  bollinger: any;
  volatilityHint: string;
  transformerHint: string;
}) {
  return `Forecast for ${data.pair}: ${data.trend}. Price: $${data.currentPrice}. ${data.volatilityHint}. ${data.transformerHint}`;
}
