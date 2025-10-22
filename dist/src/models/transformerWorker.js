"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeWithML = analyzeWithML;
async function analyzeWithML(input) {
    const HF_KEY = process.env.HUGGINGFACE_API_KEY;
    if (!HF_KEY) {
        return ruleBasedAnalysis(input);
    }
    try {
        const sentiment = await analyzeFinBERT(input);
        const techScore = calculateTechnicalScore(input);
        const finalScore = sentiment.score * 0.6 + techScore * 0.4;
        let signal;
        if (finalScore > 0.2)
            signal = 'bullish';
        else if (finalScore < -0.2)
            signal = 'bearish';
        else
            signal = 'neutral';
        return {
            signal,
            confidence: Math.abs(finalScore),
            reasoning: generateReasoning(input, sentiment, techScore)
        };
    }
    catch (error) {
        console.error('ML error:', error);
        return ruleBasedAnalysis(input);
    }
}
async function analyzeFinBERT(input) {
    const context = `
    Price momentum: ${input.ema9 > input.ema21 ? 'positive' : 'negative'}.
    Funding: ${input.fundingRate > 0 ? 'bullish' : 'bearish'} at ${(input.fundingRate * 100).toFixed(3)}%.
    Bollinger: ${input.bollingerPosition > 0 ? 'upper band' : 'lower band'}.
  `;
    const res = await fetch('https://api-inference.huggingface.co/models/ProsusAI/finbert', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: context }),
    });
    if (!res.ok)
        throw new Error(`HF API error: ${res.status}`);
    const result = await res.json();
    const sentiment = result[0].reduce((max, curr) => curr.score > max.score ? curr : max);
    const scoreMap = {
        'positive': 1, 'negative': -1, 'neutral': 0
    };
    return {
        score: scoreMap[sentiment.label.toLowerCase()] * sentiment.score,
        label: sentiment.label
    };
}
function calculateTechnicalScore(input) {
    let score = 0;
    if (input.ema9 > input.ema21)
        score += 0.4;
    else
        score -= 0.4;
    if (input.fundingRate > 0.01)
        score -= 0.3;
    else if (input.fundingRate < -0.01)
        score += 0.3;
    if (input.bollingerPosition < -0.8)
        score += 0.3;
    else if (input.bollingerPosition > 0.8)
        score -= 0.3;
    return Math.max(-1, Math.min(1, score));
}
function generateReasoning(input, sentiment, techScore) {
    const reasons = [];
    if (input.ema9 > input.ema21)
        reasons.push('Bullish EMA crossover');
    else
        reasons.push('Bearish EMA trend');
    if (Math.abs(input.fundingRate) > 0.01) {
        reasons.push(`${input.fundingRate > 0 ? 'High' : 'Negative'} funding`);
    }
    if (Math.abs(input.bollingerPosition) > 0.8) {
        reasons.push(`${input.bollingerPosition > 0 ? 'Overbought' : 'Oversold'}`);
    }
    reasons.push(`ML: ${sentiment.label}`);
    return reasons.join(' • ');
}
function ruleBasedAnalysis(input) {
    const score = calculateTechnicalScore(input);
    let signal;
    if (score > 0.3)
        signal = 'bullish';
    else if (score < -0.3)
        signal = 'bearish';
    else
        signal = 'neutral';
    return {
        signal,
        confidence: Math.abs(score),
        reasoning: 'Rule-based (no ML key)'
    };
}
