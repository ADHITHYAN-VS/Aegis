import { describe, it, expect } from 'vitest';
import {
  calculateKellyMetrics,
  checkCGTLiquidation,
  updateCGTState,
  calculateAsymptoticGrowth,
  evaluateRuinProbability,
  CGTPortfolioState
} from '../src/cgt.js';

describe('Computational Genesis Theory (CGT) Unit Tests', () => {
  it('calculates Kelly invariant L* = μ / σ² and drawdown limits correctly', () => {
    // Returns with positive mean μ = 0.01 and known variance
    const returns = [0.02, -0.01, 0.03, -0.005, 0.015];
    const metrics = calculateKellyMetrics(returns);

    expect(metrics.meanReturn).toBeGreaterThan(0);
    expect(metrics.variance).toBeGreaterThan(0);
    expect(metrics.kellyLeverage).toBeGreaterThan(0);
    expect(metrics.maxDrawdown).toBeGreaterThan(0);
    expect(metrics.safeLeverage).toBeLessThanOrEqual(metrics.kellyLeverage);
  });

  it('detects liquidation boundary x_liq when drawdown exceeds δ_max = 1 / L', () => {
    const entryPrice = 100;
    const leverage = 50; // δ_max = 1 / 50 = 0.02 (2% price drop)

    // 1.5% drop - should NOT liquidate
    const safePrice = 98.5;
    expect(checkCGTLiquidation(entryPrice, safePrice, leverage, 'LONG')).toBe(false);

    // 2.5% drop - SHOULD liquidate (exceeds δ_max = 0.02)
    const liquidatingPrice = 97.5;
    expect(checkCGTLiquidation(entryPrice, liquidatingPrice, leverage, 'LONG')).toBe(true);
  });

  it('executes state space transformations x_t -> x_{t+1} and updates equity W', () => {
    const initialState: CGTPortfolioState = {
      wealth: 1000,
      leverage: 10,
      price: 100,
      entryPrice: 100,
      position: 'LONG',
      isLiquidated: false
    };

    // Price moves up from 100 to 102 (+2% return => +20% equity gain under 10x leverage)
    const nextState = updateCGTState(initialState, 102);

    expect(nextState.wealth).toBeCloseTo(1200, 1);
    expect(nextState.isLiquidated).toBe(false);
  });

  it('triggers absorbing liquidation state x_liq = (0, L, P) when price drops past boundary', () => {
    const initialState: CGTPortfolioState = {
      wealth: 1000,
      leverage: 100, // δ_max = 1%
      price: 100,
      entryPrice: 100,
      position: 'LONG',
      isLiquidated: false
    };

    // Price drops to 98.5 (-1.5% drop exceeds δ_max = 1%)
    const liquidatedState = updateCGTState(initialState, 98.5);

    expect(liquidatedState.wealth).toBe(0);
    expect(liquidatedState.isLiquidated).toBe(true);

    // Subsequent updates remain absorbed in liquidation state x_liq
    const subsequentState = updateCGTState(liquidatedState, 105);
    expect(subsequentState.wealth).toBe(0);
    expect(subsequentState.isLiquidated).toBe(true);
  });

  it('proves asymptotic growth g(L) becomes negative for unconstrained high leverage', () => {
    const returns = [0.01, -0.012, 0.008, -0.011, 0.009];

    const growthLowLeverage = calculateAsymptoticGrowth(returns, 2);
    const growthHighLeverage = calculateAsymptoticGrowth(returns, 80);

    expect(growthLowLeverage).toBeGreaterThan(growthHighLeverage);
  });

  it('evaluates theoretical ruin probability P(wipeout) approaching 1 for high leverage', () => {
    const ruinProbLow = evaluateRuinProbability(2, 0.01, 100);
    const ruinProbHigh = evaluateRuinProbability(200, 0.01, 100);

    expect(ruinProbHigh).toBeGreaterThan(ruinProbLow);
    expect(ruinProbHigh).toBe(1.0);
  });
});
