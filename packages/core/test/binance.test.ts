import { describe, it, expect } from 'vitest';
import { BinanceFuturesClient, BinanceCGTPaperTradingBot } from '../src/binance.js';

describe('Binance Futures Public API & Paper Trading Bot Integration Tests', () => {
  it('fetches live ticker price from Binance public futures endpoints', async () => {
    const client = new BinanceFuturesClient();
    const ticker = await client.getTickerPrice('BTCUSDT');

    expect(ticker).toBeDefined();
    expect(ticker.symbol).toBe('BTCUSDT');
    expect(ticker.price).toBeGreaterThan(0);
  });

  it('fetches live/historical klines from Binance public endpoints', async () => {
    const client = new BinanceFuturesClient();
    const klines = await client.getKlines('BTCUSDT', '1m', 10);

    expect(klines).toBeDefined();
    expect(Array.isArray(klines)).toBe(true);
    expect(klines.length).toBeGreaterThan(0);
    expect(klines[0].close).toBeGreaterThan(0);
  });

  it('runs paper trading bot simulation with Kelly-bounded leverage without wipeout', async () => {
    const bot = new BinanceCGTPaperTradingBot({
      symbol: 'BTCUSDT',
      initialWealth: 10000,
      leverageMode: 'KELLY_OPTIMAL',
      fixedLeverage: 20
    });

    await bot.initialize();
    expect(bot.currentState.wealth).toBe(10000);
    expect(bot.currentState.isLiquidated).toBe(false);

    const simulationResult = await bot.runSimulation(5);

    expect(simulationResult.states.length).toBeGreaterThan(1);
    expect(simulationResult.isLiquidated).toBe(false);
    expect(simulationResult.finalWealth).toBeGreaterThan(0);
  });

  it('demonstrates liquidation when unconstrained leverage hits drawdown barrier', async () => {
    const bot = new BinanceCGTPaperTradingBot({
      symbol: 'BTCUSDT',
      initialWealth: 10000,
      leverageMode: 'NAIVE_HIGH',
      fixedLeverage: 1000 // Ultra-high 1000x leverage: 0.1% price movement causes liquidation
    });

    await bot.initialize();

    // Simulate tick where price drops by 0.2% (triggers 1000x liquidation)
    const entryPrice = bot.currentState.price;
    bot.priceHistory.push(entryPrice);

    // Manual step with adverse price
    const adversePrice = entryPrice * 0.997; // 0.3% drop
    const state = await bot.step(adversePrice);
    expect(state.isLiquidated).toBe(true);
    expect(state.wealth).toBe(0);
  });
});
