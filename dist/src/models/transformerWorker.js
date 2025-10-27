export type MLInput = {
  price: number;
  volume: number;
  ema9: number;
  ema21: number;
  fundingRate: number;
  bollingerPosition: number;
};

export type MLOutput = {
  signal: "bullish" | "bearish" | "neutral";
  confidence: number;
  reasoning: string;
};

export async function analyzeWithML(input: MLInput): Promise<MLOutput> {
  const HF_KEY = process.env.HUGGINGFACE_API_KEY;
  if (!HF_KEY) return ruleBasedAnalysis(input);

  try {
    const sentiment = await analyzeFinBERT(input);
    const techScore = calculateTechnicalScore(input);
    const finalScore = sentiment.score * 0.6 + techScore * 0.4;

    const signal =
      finalScore > 0.2 ? "bullish" :
      finalScore < -0.2 ? "bearish" :
      "neutral";

    return {
      signal,
      confidence: Math.min(1, Math.abs(finalScore)),
      reasoning: generateReasoning(input, sentiment, techScore)
    };
  } catch (error) {
    console.error("ML error:", error);
    return ruleBasedAnalysis(input);
  }
}

type SentimentResult = {
  score: number;
  label: string;
};

async function analyzeFinBERT(input: MLInput): Promise<SentimentResult> {
  const context = `
    Price momentum: ${input.ema9 > input.ema21 ? "positive" : "negative"}.
    Funding: ${input.fundingRate > 0 ? "bullish" : "bearish"} at ${(input.fundingRate * 100).toFixed(3)}%.
    Bollinger: ${input.bollingerPosition > 0 ? "upper band" : "lower band"}.
  `;

  const res = await fetch("https://api-inference.huggingface.co/models/ProsusAI/finbert", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ inputs: context.trim() })
  });

  if (!res.ok) throw new Error(`HF API error: ${res.status}`);
  const result = await res.json();

  const best = Array.isArray(result[0])
    ? result[0].reduce((max, curr) => curr.score > max.score ? curr : max)
    : { label: "neutral", score: 0 };

  const scoreMap = { positive: 1, negative: -1, neutral: 0 };
  const mappedScore = scoreMap[best.label.toLowerCase()] ?? 0;

  return {
    score: mappedScore * best.score,
    label: best.label
  };
}

function calculateTechnicalScore(input: MLInput): number {
  let score = 0;

  score += input.ema9 > input.ema21 ? 0.4 : -0.4;
  score += input.fundingRate < -0.01 ? 0.3 : input.fundingRate > 0.01 ? -0.3 : 0;
  score += input.bollingerPosition < -0.8 ? 0.3 : input.bollingerPosition > 0.8 ? -0.3 : 0;

  return Math.max(-1, Math.min(1, score));
}

function generateReasoning(input: MLInput, sentiment: SentimentResult, techScore: number): string {
  const reasons: string[] = [];

  reasons.push(input.ema9 > input.ema21 ? "Bullish EMA crossover" : "Bearish EMA trend");

  if (Math.abs(input.fundingRate) > 0.01)
    reasons.push(`${input.fundingRate > 0 ? "High" : "Negative"} funding`);

  if (Math.abs(input.bollingerPosition) > 0.8)
    reasons.push(`${input.bollingerPosition > 0 ? "Overbought" : "Oversold"}`);

  reasons.push(`ML: ${sentiment.label}`);

  return reasons.join(" • ");
}

function ruleBasedAnalysis(input: MLInput): MLOutput {
  const score = calculateTechnicalScore(input);

  const signal =
    score > 0.3 ? "bullish" :
    score < -0.3 ? "bearish" :
    "neutral";

  return {
    signal,
    confidence: Math.min(1, Math.abs(score)),
    reasoning: "Rule-based (no ML key)"
  };
}
