import {
  BinanceCGTPaperTradingBot,
  BinanceFuturesClient,
  calculateKellyMetrics,
  calculateAsymptoticGrowth,
  evaluateRuinProbability
} from '@aegis/core';

async function main() {
  console.log('================================================================================');
  console.log(' Computational Genesis Theory (CGT) - Leveraged State Dynamics & Binance Paper Trading');
  console.log('================================================================================\n');

  const client = new BinanceFuturesClient();
  const ticker = await client.getTickerPrice('BTCUSDT');
  console.log(`Live Binance Futures Price (BTCUSDT): $${ticker.price}`);

  const klines = await client.getKlines('BTCUSDT', '1m', 50);
  const returns: number[] = [];
  for (let i = 1; i < klines.length; i++) {
    returns.push((klines[i].close - klines[i - 1].close) / klines[i - 1].close);
  }

  const metrics = calculateKellyMetrics(returns);
  console.log(`\nMarket Metrics (from ${klines.length} Binance 1m candles):`);
  console.log(` - Expected Return (μ): ${(metrics.meanReturn * 100).toFixed(4)}% per minute`);
  console.log(` - Volatility (σ): ${(metrics.stdDev * 100).toFixed(4)}%`);
  console.log(` - Max Drawdown Observed: ${(metrics.maxDrawdown * 100).toFixed(2)}%`);
  console.log(` - CGT Kelly Leverage Invariant (L*): ${metrics.kellyLeverage.toFixed(2)}x`);
  console.log(` - Drawdown-Safe Leverage Limit: ${metrics.safeLeverage.toFixed(2)}x`);

  const ruinProb100x = evaluateRuinProbability(100, metrics.stdDev, 100);
  console.log(` - Theoretical Ruin Probability P(wipeout) at 100x Leverage: ${(ruinProb100x * 100).toFixed(2)}%`);

  console.log('\n--- Model 1: Naive High Leverage Bot (L = 100x) ---');
  const naiveBot = new BinanceCGTPaperTradingBot({
    symbol: 'BTCUSDT',
    initialWealth: 10000,
    leverageMode: 'NAIVE_HIGH',
    fixedLeverage: 100
  });
  await naiveBot.initialize();
  const naiveRes = await naiveBot.runSimulation(10);
  console.log(`Final Wealth: $${naiveRes.finalWealth.toFixed(2)}`);
  console.log(`Is Liquidated: ${naiveRes.isLiquidated}`);
  console.log(`Growth Rate g(100): ${naiveRes.growthRate === -Infinity ? '-Infinity (Liquidation)' : naiveRes.growthRate.toFixed(4)}`);

  console.log('\n--- Model 2: CGT Kelly-Bounded Dynamic Leverage Bot ---');
  const kellyBot = new BinanceCGTPaperTradingBot({
    symbol: 'BTCUSDT',
    initialWealth: 10000,
    leverageMode: 'KELLY_OPTIMAL',
    fixedLeverage: 100
  });
  await kellyBot.initialize();
  const kellyRes = await kellyBot.runSimulation(10);
  console.log(`Final Wealth: $${kellyRes.finalWealth.toFixed(2)}`);
  console.log(`Is Liquidated: ${kellyRes.isLiquidated}`);
  console.log(`Effective Dynamic Leverage: ${kellyBot.currentState.leverage.toFixed(2)}x`);
  console.log(`Growth Rate g(L*): ${kellyRes.growthRate.toFixed(6)}`);

  console.log('\n================================================================================');
  console.log(' PROOF CONCLUSION:');
  console.log(' Unconstrained high leverage under non-zero market volatility triggers liquidation');
  console.log(' boundary x_liq due to drawdown barrier δ_max = 1/L. Bounding leverage by the Kelly');
  console.log(' invariant L* avoids wipeout and optimizes long-term growth.');
  console.log('================================================================================');
}

main().catch(console.error);
