import { AdaptiveResponder } from './responder.js';

/**
 * Layer 3: Active Sentinel (Anti-Debug & Anti-Hook)
 */
export class Sentinel {
  private responder: AdaptiveResponder;
  private intervalId: any = null;

  constructor(responder: AdaptiveResponder) {
    this.responder = responder;
  }

  public startMonitoring(intervalMs = 1000): void {
    if (typeof window === 'undefined') return;

    this.intervalId = setInterval(() => {
      this.checkDevToolsTiming();
      this.checkNativeHooks();
    }, intervalMs);
  }

  public stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private checkDevToolsTiming(): void {
    const start = performance.now();
    // Debugger statement causes delay if DevTools is open and paused/breakpoint hit
    // or timing anomaly detected
    // Note: We use eval('debugger') to avoid static code stripping
    try {
      Function('debugger')();
    } catch (_) {}
    const end = performance.now();

    if (end - start > 100) {
      // DevTools breakpoint / debugger open detected
      this.responder.triggerLevel2StateLock();
    }
  }

  private checkNativeHooks(): void {
    if (typeof HTMLDivElement === 'undefined') return;

    const nativeRemoveChild = HTMLDivElement.prototype.removeChild.toString();
    if (!nativeRemoveChild.includes('[native code]')) {
      // Prototype hook detected
      this.responder.triggerLevel1Honeypot();
    }
  }
}
