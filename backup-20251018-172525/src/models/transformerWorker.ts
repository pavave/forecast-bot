// src/models/transformerWorker.ts
// ML-based market sentiment analysis using Hugging Face

interface TransformerInput {
  price: number;
  volume: number;
  ema9: number;
  ema21: number;
  fundingRate: number;
  bollingerPosition: number; // -1 to 1
}

interface TransformerOutput {
  signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number; // 0-1
  reasoning: string;
}

export async function analyzeWithTransformer(
  input: TransformerInput
): Promise<TransformerOutput> {
  const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
  
  if (!HF_API_KEY) {
    // Fallback to rule-based system if no API key
    return ruleBasedAnalysis(input);
  }

  try {
    // Use FinBERT for financial sentiment
    const sentiment = await analyzeFinancialSentiment(input);
    
    // Combine with technical indicators
    const technicalScore = calculateTechnicalScore(input);
    
    // Weighted final decision
    const finalScore = sentiment.score * 0.6 + technicalScore * 0.4;
    
    let signal: 'bullish' | 'bearish' | 'neutral';
    if (finalScore > 0.2) signal = 'bullish';
    else if (finalScore < -0.2) signal = 'bearish';
    else signal = 'neutral';
    
    return {
      signal,
      confidence: Math.abs(finalScore),
      reasoning: generateReasoning(input, sentiment, technicalScore)
    };
  } catch (error) {
    console.error('Transformer error:', error);
    return ruleBasedAnalysis(input);
  }
}

async function analyzeFinancialSentiment(input: TransformerInput) {
  const HF_API_KEY = process.env.HUGGINGFACE_API_KEY!;
  
  // Create market context text for FinBERT
  const marketContext = `
    Price momentum: ${input.ema9 > input.ema21 ? 'positive' : 'negative'}. 
    Funding rate: ${input.fundingRate > 0 ? 'bullish' : 'bearish'} at ${(input.fundingRate * 100).toFixed(3)}%.
    Bollinger position: ${input.bollingerPosition > 0 ? 'upper band' : 'lower band'}.
    Volume trend: ${input.volume > 0 ? 'increasing' : 'decreasing'}.
  `;

  const response = await fetch(
    'https://api-inference.huggingface.co/models/ProsusAI/finbert',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: marketContext }),
    }
  );

  if (!response.ok) {
    throw new Error(`HF API error: ${response.status}`);
  }

  const result = await response.json();
  
  // FinBERT returns [positive, negative, neutral] scores
  const scores = result[0];
  const sentiment = scores.reduce((max: any, curr: any) => 
    curr.score > max.score ? curr : max
  );
  
  // Convert to -1 to 1 scale
  const sentimentMap: Record<string, number> = {
    'positive': 1,
    'negative': -1,
    'neutral': 0
  };
  
  return {
    score: sentimentMap[sentiment.label.toLowerCase()] * sentiment.score,
    label: sentiment.label
  };
}

function calculateTechnicalScore(input: TransformerInput): number {
  let score = 0;
  
  // EMA crossover (40% weight)
  if (input.ema9 > input.ema21) score += 0.4;
  else score -= 0.4;
  
  // Funding rate (30% weight)
  if (input.fundingRate > 0.01) score -= 0.3; // High funding = overheated
  else if (input.fundingRate < -0.01) score += 0.3; // Negative = undervalued
  
  // Bollinger position (30% weight)
  if (input.bollingerPosition < -0.8) score += 0.3; // Oversold
  else if (input.bollingerPosition > 0.8) score -= 0.3; // Overbought
  
  return Math.max(-1, Math.min(1, score));
}

function generateReasoning(
  input: TransformerInput,
  sentiment: { score: number; label: string },
  technicalScore: number
): string {
  const reasons: string[] = [];
  
  // EMA trend
  if (input.ema9 > input.ema21) {
    reasons.push('Short-term trend above long-term');
  } else {
    reasons.push('Downward momentum detected');
  }
  
  // Funding rate
  if (Math.abs(input.fundingRate) > 0.01) {
    reasons.push(`${input.fundingRate > 0 ? 'High' : 'Negative'} funding rate`);
  }
  
  // Bollinger bands
  if (Math.abs(input.bollingerPosition) > 0.8) {
    reasons.push(`Price near ${input.bollingerPosition > 0 ? 'upper' : 'lower'} band`);
  }
  
  // ML sentiment
  reasons.push(`ML sentiment: ${sentiment.label}`);
  
  return reasons.join(' • ');
}

function ruleBasedAnalysis(input: TransformerInput): TransformerOutput {
  const score = calculateTechnicalScore(input);
  
  let signal: 'bullish' | 'bearish' | 'neutral';
  if (score > 0.3) signal = 'bullish';
  else if (score < -0.3) signal = 'bearish';
  else signal = 'neutral';
  
  return {
    signal,
    confidence: Math.abs(score),
    reasoning: 'Rule-based analysis (no ML API key)'
  };
}
