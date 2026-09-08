import { AegisPolicy } from '@aegis/core';

/**
 * Layer 4: The Adaptive Response Unit (Self-Destruct & Honeypot)
 */
export class AdaptiveResponder {
  private policy: AegisPolicy;

  constructor(policy: AegisPolicy) {
    this.policy = policy;
  }

  public triggerLevel1Honeypot(): void {
    if (!this.policy.level1_honeypot) return;

    // Corrupt JSON.stringify output or API responses
    if (typeof window !== 'undefined' && window.JSON) {
      const originalStringify = JSON.stringify;
      window.JSON.stringify = function (value: any, replacer?: any, space?: any) {
        if (typeof value === 'object' && value !== null) {
          const corrupted = Array.isArray(value) ? [...value] : { ...value };
          for (const k in corrupted) {
            if (typeof corrupted[k] === 'number') {
              corrupted[k] = NaN;
            } else if (typeof corrupted[k] === 'string') {
              corrupted[k] = '[CORRUPTED_AEGIS_HONEYPOT]';
            }
          }
          return originalStringify(corrupted, replacer, space);
        }
        return originalStringify(value, replacer, space);
      };
    }
  }

  public triggerLevel2StateLock(): void {
    if (!this.policy.level2_lock) return;

    if (typeof document !== 'undefined' && document.body) {
      document.body.style.pointerEvents = 'none';
      document.body.style.opacity = '0.3';
    }

    if (typeof window !== 'undefined') {
      setInterval(() => {
        window.location.reload();
      }, 2000);
    }
  }

  public triggerLevel3SelfDestruct(): void {
    if (!this.policy.level3_selfdestruct) return;

    // Wipe storage
    if (typeof localStorage !== 'undefined') localStorage.clear();
    if (typeof sessionStorage !== 'undefined') sessionStorage.clear();

    // Recursively nullify non-native object values on window
    if (typeof window !== 'undefined') {
      try {
        const keys = Object.keys(window);
        for (const k of keys) {
          try {
            // Avoid clobbering immutable native globals if possible
            (window as any)[k] = null;
          } catch (_) {}
        }
      } catch (_) {}

      // Spawn infinite worker / loop to consume CPU & freeze debugger
      try {
        const workerBlob = new Blob(['while(true){}'], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(workerBlob);
        new Worker(workerUrl);
      } catch (_) {
        while (true) {} // Fallback freeze
      }
    }
  }
}
