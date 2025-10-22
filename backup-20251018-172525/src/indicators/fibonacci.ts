// src/indicators/fibonacci.ts
// Fibonacci retracement and extension levels

export interface FibonacciLevels {
  high: number;
  low: number;
  retracement: {
    level_0: number;      // 0% (high)
    level_236: number;    // 23.6%
    level_382: number;    // 38.2%
    level_500: number;    // 50%
    level_618: number;    // 61.8% (golden ratio)
    level_786: number;    // 78.6%
    level_1000: number;   // 100% (low)
  };
  extension: {
    level_1272: number;   // 127.2%
    level_1618: number;   // 161.8%
    level_2618: number;   // 261.8%
  };
  currentLevel: string;   // Which level price is near
  signal: 'support' | 'resistance' | 'neutral';
}

/**
 * Calculate Fibonacci retracement levels
 * @param prices Array of closing prices
 * @param lookback Number of periods to look back (default: 100)
 */
export function calculateFibonacci(
  prices: number[],
  lookback: number = 100
): FibonacciLevels {
  if (prices.length < 2) {
    throw new Error('Need at least 2 prices for Fibonacci');
  }

  // Get recent prices
  const recentPrices = prices.slice(-lookback);
  
  // Find swing high and low
  const high = Math.max(...recentPrices);
  const low = Math.min(...recentPrices);
  const range = high - low;
  
  // Current price
  const currentPrice = prices[prices.length - 1];
  
  // Calculate retracement levels (from high to low)
  const retracement = {
    level_0: high,
    level_236: high - range * 0.236,
    level_382: high - range * 0.382,
    level_500: high - range * 0.500,
    level_618: high - range * 0.618,
    level_786: high - range * 0.786,
    level_1000: low
  };
  
  // Calculate extension levels (below low)
  const extension = {
    level_1272: low - range * 0.272,
    level_1618: low - range * 0.618,
    level_2618: low - range * 1.618
  };
  
  // Determine current level and signal
  const { currentLevel, signal } = analyzeFibPosition(
    currentPrice,
    retracement,
    extension
  );
  
  return {
    high,
    low,
    retracement,
    extension,
    currentLevel,
    signal
  };
}

function analyzeFibPosition(
  price: number,
  retracement: FibonacciLevels['retracement'],
  extension: FibonacciLevels['extension']
): { currentLevel: string; signal: 'support' | 'resistance' | 'neutral' } {
  const tolerance = 0.005; // 0.5% tolerance
  
  // Check retracement levels
  const levels = [
    { name: '0% (High)', value: retracement.level_0, type: 'resistance' },
    { name: '23.6%', value: retracement.level_236, type: 'resistance' },
    { name: '38.2%', value: retracement.level_382, type: 'support' },
    { name: '50%', value: retracement.level_500, type: 'support' },
    { name: '61.8% (Golden)', value: retracement.level_618, type: 'support' },
    { name: '78.6%', value: retracement.level_786, type: 'support' },
    { name: '100% (Low)', value: retracement.level_1000, type: 'support' },
  ];
  
  // Find nearest level
  let nearest = levels[0];
  let minDistance = Math.abs(price - nearest.value);
  
  for (const level of levels) {
    const distance = Math.abs(price - level.value);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = level;
    }
  }
  
  // Check if price is near a level
  const percentDiff = minDistance / price;
  if (percentDiff < tolerance) {
    return {
      currentLevel: `Near ${nearest.name}`,
      signal: nearest.type as 'support' | 'resistance'
    };
  }
  
  // Check if between levels
  if (price > retracement.level_618 && price < retracement.level_382) {
    return {
      currentLevel: 'Between 38.2% and 61.8%',
      signal: 'neutral'
    };
  }
  
  if (price > retracement.level_500) {
    return {
      currentLevel: 'Above 50% retracement',
      signal: 'resistance'
    };
  }
  
  return {
    currentLevel: 'Below key support',
    signal: 'support'
  };
}

/**
 * Get emoji representation of Fibonacci signal
 */
export function getFibonacciEmoji(signal: string): string {
  const emojiMap: Record<string, string> = {
    'support': '🟢',
    'resistance': '🔴',
    'neutral': '⚪️'
  };
  return emojiMap[signal] || '⚪️';
}

/**
 * Format Fibonacci analysis for display
 */
export function formatFibonacciAnalysis(fib: FibonacciLevels): string {
  const emoji = getFibonacciEmoji(fib.signal);
  return `${emoji} ${fib.currentLevel} • ${fib.signal}`;
}
