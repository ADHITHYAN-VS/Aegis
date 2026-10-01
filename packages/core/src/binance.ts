/**
 * Binance Futures Live Public Endpoint Data Client & CGT Paper Trading Bot
 */

import {
  CGTPortfolioState,
  CGTKellyMetrics,
  calculateKellyMetrics,
  updateCGTState,
  calculateAsymptoticGrowth
} from './cgt.js';

export interface BinanceKline {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class BinanceFuturesClient {
  private baseEndpoints: string[];

  constructor(customEndpoints?: string[]) {
    this.baseEndpoints = customEndpoints || [
      'https://testnet.binancefuture.com',
      'https://data-api.binance.vision',
      'https://api.binance.us',
      'https://fapi.binance.com'
    ];
  }

  /**
   * Fetches the latest ticker price for a futures contract symbol using fallback endpoints.
   */
  async getTickerPrice(symbol: string = 'BTCUSDT'): Promise<{ symbol: string; price: number }> {
    for (const baseUrl of this.baseEndpoints) {
      try {
        const endpoint = baseUrl.includes('/api/v3') || baseUrl.includes('vision') || baseUrl.includes('binance.us')
          ? `${baseUrl}/api/v3/ticker/price?symbol=${symbol}`
          : `${baseUrl}/fapi/v1/ticker/price?symbol=${symbol}`;

        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json() as { symbol: string; price: string };
          if (data && data.price) {
            return {
              symbol: data.symbol || symbol,
              price: parseFloat(data.price)
            };
          }
        }
      } catch {
        // Continue to fallback endpoint
      }
    }

    // Fallback default value if all remote endpoints fail or offline
    return { symbol, price: 85000 };
  }

  /**
   * Fetches historical or live kline/candle data for return and volatility estimation.
   */
  async getKlines(
    symbol: string = 'BTCUSDT',
    interval: string = '1m',
    limit: number = 50
  ): Promise<BinanceKline[]> {
    for (const baseUrl of this.baseEndpoints) {
      try {
        const isSpotApi = baseUrl.includes('vision') || baseUrl.includes('binance.us');
        const path = isSpotApi ? '/api/v3/klines' : '/fapi/v1/klines';
        const endpoint = `${baseUrl}${path}?symbol=${symbol}&interval=${interval}&limit=${limit}`;

        const res = await fetch(endpoint);
        if (res.ok) {
          const rawData = await res.json() as any[];
          if (Array.isArray(rawData) && rawData.length > 0) {
            return rawData.map(item => ({
              openTime: Number(item[0]),
              open: parseFloat(item[1]),
              high: parseFloat(item[2]),
              low: parseFloat(item[3]),
              close: parseFloat(item[4]),
              volume: parseFloat(item[5])
            }));
          }
        }
      } catch {
        // Continue to fallback endpoint
      }
    }

    // Return synthetic simulated klines if network completely unavailable
    const now = Date.now();
    const mockKlines: BinanceKline[] = [];
    let price = 85000;
    for (let i = 0; i < limit; i++) {
      const change = (Math.random() - 0.48) * 200;
      price += change;
      mockKlines.push({
        openTime: now - (limit - i) * 60000,
        open: price - change,
        high: price + 50,
        low: price - 50,
        close: price,
        volume: 10 + Math.random() * 50
      });
    }
    return mockKlines;
  }
}

export interface BotConfig {
  symbol?: string;
  initialWealth?: number;
  leverageMode?: 'NAIVE_HIGH' | 'KELLY_OPTIMAL';
  fixedLeverage?: number;
}

export class BinanceCGTPaperTradingBot {
  private client: BinanceFuturesClient;
  public symbol: string;
  public initialWealth: number;
  public leverageMode: 'NAIVE_HIGH' | 'KELLY_OPTIMAL';
  public fixedLeverage: number;

  public currentState: CGTPortfolioState;
  public priceHistory: number[] = [];
  public returnHistory: number[] = [];
  public kellyMetrics: CGTKellyMetrics | null = null;

  constructor(config: BotConfig = {}) {
    this.client = new BinanceFuturesClient();
    this.symbol = config.symbol || 'BTCUSDT';
    this.initialWealth = config.initialWealth || 10000;
    this.leverageMode = config.leverageMode || 'KELLY_OPTIMAL';
    this.fixedLeverage = config.fixedLeverage || 100;

    this.currentState = {
      wealth: this.initialWealth,
      leverage: this.leverageMode === 'NAIVE_HIGH' ? this.fixedLeverage : 1,
      price: 0,
      entryPrice: 0,
      position: 'FLAT',
      isLiquidated: false
    };
  }

  /**
   * Initializes market data and evaluates initial Kelly invariants.
   */
  async initialize(): Promise<void> {
    const klines = await this.client.getKlines(this.symbol, '1m', 50);
    this.priceHistory = klines.map(k => k.close);

    for (let i = 1; i < this.priceHistory.length; i++) {
      const r = (this.priceHistory[i] - this.priceHistory[i - 1]) / this.priceHistory[i - 1];
      this.returnHistory.push(r);
    }

    this.kellyMetrics = calculateKellyMetrics(this.returnHistory);

    const latestPrice = this.priceHistory[this.priceHistory.length - 1] || 85000;
    const effectiveLeverage = this.leverageMode === 'NAIVE_HIGH'
      ? this.fixedLeverage
      : Math.min(this.fixedLeverage, this.kellyMetrics.safeLeverage);

    this.currentState = {
      wealth: this.initialWealth,
      leverage: Math.max(1, effectiveLeverage),
      price: latestPrice,
      entryPrice: latestPrice,
      position: 'LONG',
      isLiquidated: false
    };
  }

  /**
   * Performs one tick update using live public endpoint data from Binance Futures.
   */
  async step(overridePrice?: number): Promise<CGTPortfolioState> {
    if (this.currentState.isLiquidated) {
      return this.currentState;
    }

    const currentPrice = overridePrice !== undefined
      ? overridePrice
      : (await this.client.getTickerPrice(this.symbol)).price;

    if (this.priceHistory.length > 0) {
      const lastPrice = this.priceHistory[this.priceHistory.length - 1];
      if (lastPrice > 0) {
        const r = (currentPrice - lastPrice) / lastPrice;
        this.returnHistory.push(r);
      }
    }
    this.priceHistory.push(currentPrice);

    // Re-evaluate Kelly invariant dynamically if in KELLY_OPTIMAL mode
    if (this.leverageMode === 'KELLY_OPTIMAL' && this.returnHistory.length >= 5) {
      this.kellyMetrics = calculateKellyMetrics(this.returnHistory.slice(-50));
      this.currentState.leverage = Math.max(0.1, Math.min(this.fixedLeverage, this.kellyMetrics.safeLeverage));
    }

    // Apply CGT state transformation update
    this.currentState = updateCGTState(this.currentState, currentPrice);
    return this.currentState;
  }

  /**
   * Runs a live paper trading simulation loop for a given number of steps.
   */
  async runSimulation(steps: number = 10): Promise<{
    finalWealth: number;
    isLiquidated: boolean;
    growthRate: number;
    kellyLeverage: number;
    states: CGTPortfolioState[];
  }> {
    if (this.priceHistory.length === 0) {
      await this.initialize();
    }

    const states: CGTPortfolioState[] = [this.currentState];

    for (let i = 0; i < steps; i++) {
      const state = await this.step();
      states.push(state);
      if (state.isLiquidated) {
        break;
      }
    }

    const growthRate = calculateAsymptoticGrowth(this.returnHistory, this.currentState.leverage);
    const kellyLeverage = this.kellyMetrics ? this.kellyMetrics.kellyLeverage : 1;

    return {
      finalWealth: this.currentState.wealth,
      isLiquidated: this.currentState.isLiquidated,
      growthRate,
      kellyLeverage,
      states
    };
  }
}
