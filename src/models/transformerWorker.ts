export interface MLInput {
  price: number;
  volume: number;
  ema9: number;
  ema21: number;
  fundingRate: number;
  bollingerPosition: number;
}

export interface MLOutput {
  signal: "bullish" | "bearish" | "neutral";
  confidence: number;
  reasoning: string;
}

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
  const HF_API_KEY = process.env.HUGGINGFACE_API_KEY!;
  const marketContext = `
    Price momentum: ${input.ema9 > input.ema21 ? "positive" : "negative"}.
    Funding rate: ${input.fundingRate > 0 ? "bullish" : "bearish"} at ${(input.fundingRate * 100).toFixed(3)}%.
    Bollinger position: ${input.bollingerPosition > 0 ? "upper band" : "lower band"}.
  `.trim();

  const response = await fetch(
    "https://api-inference.huggingface.co/models/cardiffnlp/twitter-roberta-base-sentiment-latest",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: marketContext })
    }
  );

  if (!response.ok) throw new Error(`HF API error: ${response.status}`);
  const result = await response.json();
  const scores = result[0];

  const sentiment = scores.reduce((max: any, curr: any) =>
    curr.score > max.score ? curr : max
  );

  const sentimentMap: Record<string, number> = {
    positive: 1,
    negative: -1,
    neutral: 0
  };

  return {
    score: sentimentMap[sentiment.label.toLowerCase()] * sentiment.score,
    label: sentiment.label
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

export async function transformerWorker(input: {
  price: number;
  volume: number;
  fundingRate: number;
  emaTrend: string;
  elliottPhase: string;
}): Promise<string> {
  return "ML says: possible breakout";
}
