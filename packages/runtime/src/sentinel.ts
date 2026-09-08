import { AegisPolicy } from '@aegis/core';
import { AdaptiveResponder } from './responder.js';

/**
 * Layer 3: Active Sentinel (Anti-Debug & Anti-Hook)
 */
export class Sentinel {
  private responder: AdaptiveResponder;
  private policy?: AegisPolicy;
  private intervalId: any = null;

  constructor(responder: AdaptiveResponder, policy?: AegisPolicy) {
    this.responder = responder;
    this.policy = policy;
  }

  public startMonitoring(intervalMs = 1000): void {
    if (typeof window === 'undefined') return;

    this.intervalId = setInterval(() => {
      this.checkDevToolsTiming();
      this.checkNativeHooks();
      this.checkConsoleHooks();
    }, intervalMs);
  }

  public stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private checkDevToolsTiming(): void {
    const start = performance.now();
    try {
      Function('debugger')();
    } catch (_) {}
    const end = performance.now();

    if (end - start > 100) {
      this.responder.triggerLevel2StateLock();
    }
  }

  private checkNativeHooks(): void {
    if (typeof HTMLDivElement === 'undefined') return;

    // Check if extensions in whitelist exist
    if (this.policy && this.policy.whitelisted_extensions.length > 0) {
      const currentScript = document.currentScript as HTMLScriptElement;
      if (currentScript && this.policy.whitelisted_extensions.some(ext => currentScript.src.includes(ext))) {
        return; // Whitelisted extension
      }
    }

    const nativeRemoveChild = HTMLDivElement.prototype.removeChild.toString();
    if (!nativeRemoveChild.includes('[native code]') && !nativeRemoveChild.includes('native')) {
      this.responder.triggerLevel1Honeypot();
    }
  }

  private checkConsoleHooks(): void {
    if (typeof console === 'undefined') return;

    const nativeLog = console.log.toString();
    if (!nativeLog.includes('[native code]') && !nativeLog.includes('native')) {
      this.responder.triggerLevel1Honeypot();
    }
  }
}
