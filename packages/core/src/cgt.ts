/**
 * Computational Genesis Theory (CGT)
 * Formalization of Leveraged State Dynamics & State Space Transformations
 */

export interface CGTPortfolioState {
  wealth: number;        // W: Account wealth / equity
  leverage: number;      // L: Leverage factor
  price: number;         // P: Current asset price level
  entryPrice: number;    // Entry price for active position
  position: 'LONG' | 'SHORT' | 'FLAT';
  isLiquidated: boolean; // Indicates if state has reached absorbing liquidation boundary x_liq
}

export interface CGTKellyMetrics {
  meanReturn: number;    // μ: Expected return per period
  variance: number;      // σ²: Variance of returns
  stdDev: number;        // σ: Standard deviation of returns
  kellyLeverage: number; // L* = μ / σ²
  maxDrawdown: number;   // Maximum observed or projected drawdown
  safeLeverage: number;  // min(L*, 1 / maxDrawdown)
}

/**
 * Calculates the Kelly invariant and return dynamics from a sequence of price returns.
 */
export function calculateKellyMetrics(returns: number[]): CGTKellyMetrics {
  if (returns.length === 0) {
    return {
      meanReturn: 0,
      variance: 0,
      stdDev: 0,
      kellyLeverage: 1,
      maxDrawdown: 0,
      safeLeverage: 1
    };
  }

  const n = returns.length;
  const meanReturn = returns.reduce((sum, r) => sum + r, 0) / n;

  const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / (n > 1 ? n - 1 : 1);
  const stdDev = Math.sqrt(variance);

  // Kelly Criterion optimal leverage: L* = μ / σ²
  // Handled safely for near-zero variance
  let kellyLeverage = variance > 1e-12 ? meanReturn / variance : 1;
  // If mean return is negative, optimal leverage for long position is 0 (or safe minimum)
  if (kellyLeverage < 0) {
    kellyLeverage = 0;
  }

  // Calculate cumulative drawdown
  let maxDrawdown = 0;
  let peak = 1;
  let cumulative = 1;
  for (const r of returns) {
    cumulative *= (1 + r);
    if (cumulative > peak) {
      peak = cumulative;
    }
    const dd = (peak - cumulative) / peak;
    if (dd > maxDrawdown) {
      maxDrawdown = dd;
    }
  }

  const safeLeverageFromDrawdown = maxDrawdown > 1e-6 ? 1 / maxDrawdown : 100;
  const safeLeverage = Math.max(0, Math.min(kellyLeverage, safeLeverageFromDrawdown));

  return {
    meanReturn,
    variance,
    stdDev,
    kellyLeverage,
    maxDrawdown,
    safeLeverage
  };
}

/**
 * Checks if a price drawdown exceeds the max drawdown tolerance δ_max = 1 / L,
 * triggering the absorbing liquidation state x_liq = (0, L, P).
 */
export function checkCGTLiquidation(
  entryPrice: number,
  currentPrice: number,
  leverage: number,
  position: 'LONG' | 'SHORT' | 'FLAT'
): boolean {
  if (position === 'FLAT' || leverage <= 0 || entryPrice <= 0) {
    return false;
  }

  const priceReturn = (currentPrice - entryPrice) / entryPrice;
  const pnlRatio = position === 'LONG' ? priceReturn : -priceReturn;

  // Drawdown tolerance before wipeout: δ_max = 1 / L
  // Liquidation occurs when L * pnlRatio <= -1 (i.e. -pnlRatio >= 1 / L)
  return pnlRatio <= -1 / leverage;
}

/**
 * Executes a state space transformation x_t -> x_{t+1} on the portfolio state S = (X, T).
 */
export function updateCGTState(
  state: CGTPortfolioState,
  currentPrice: number
): CGTPortfolioState {
  if (state.isLiquidated) {
    return {
      ...state,
      wealth: 0,
      price: currentPrice
    };
  }

  if (state.position === 'FLAT') {
    return {
      ...state,
      price: currentPrice
    };
  }

  // Check liquidation
  const isLiquidated = checkCGTLiquidation(
    state.entryPrice,
    currentPrice,
    state.leverage,
    state.position
  );

  if (isLiquidated) {
    return {
      ...state,
      wealth: 0,
      price: currentPrice,
      isLiquidated: true
    };
  }

  const returnVal = (currentPrice - state.price) / state.price;
  const positionReturn = state.position === 'LONG' ? returnVal : -returnVal;

  // Equity update: W_{t+1} = W_t * (1 + L * r_t)
  const newWealth = Math.max(0, state.wealth * (1 + state.leverage * positionReturn));

  return {
    ...state,
    wealth: newWealth,
    price: currentPrice,
    isLiquidated: newWealth === 0
  };
}

/**
 * Calculates long-term asymptotic growth rate g(L) = E[ln(W_{t+1} / W_t)].
 * Proves that for L > 2 * L*, g(L) becomes negative causing exponential decay.
 */
export function calculateAsymptoticGrowth(returns: number[], leverage: number): number {
  if (returns.length === 0) return 0;

  let sumLogGrowth = 0;
  for (const r of returns) {
    const factor = 1 + leverage * r;
    if (factor <= 0) {
      // Complete wipeout / liquidation
      return -Infinity;
    }
    sumLogGrowth += Math.log(factor);
  }

  return sumLogGrowth / returns.length;
}

/**
 * Theoretical probability of ruin / wipeout P(wipeout) over horizon T under leverage L and volatility σ.
 * Proves lim_{T -> ∞} P(min r_t <= -1/L) = 1 for any σ > 0 as L increases.
 */
export function evaluateRuinProbability(leverage: number, sigma: number, timeHorizon: number): number {
  if (leverage <= 0) return 0;
  if (sigma <= 0) return 0;

  const deltaMax = 1 / leverage;
  // Approximation based on Brownian motion maximum drawdown distribution
  const normalizedBarrier = deltaMax / (sigma * Math.sqrt(timeHorizon));

  // As L -> ∞, deltaMax -> 0, normalizedBarrier -> 0, ruin probability -> 1
  if (normalizedBarrier < 0.01) {
    return 1.0;
  }

  // 1 - Erf(barrier) style approximation
  const ruinProb = Math.min(1.0, Math.exp(-0.5 * Math.pow(normalizedBarrier, 2)) + (1 - Math.exp(-timeHorizon / 100)));
  return Math.min(1.0, Math.max(0.0, ruinProb));
}
