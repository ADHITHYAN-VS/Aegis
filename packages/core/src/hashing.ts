/**
 * FNV-1a 32-bit hash implementation.
 */
export function fnv1a32(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * FNV-1a 64-bit hash returning BigInt.
 */
export function fnv1a64(str: string): bigint {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let i = 0; i < str.length; i++) {
    hash ^= BigInt(str.charCodeAt(i));
    hash = (hash * prime) & 0xffffffffffffffffn;
  }
  return hash;
}

/**
 * Async SHA-256 wrapper using WebCrypto API (or Node crypto fallback if WebCrypto unavailable).
 */
export async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(data);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    const nodeCrypto = await import('crypto');
    return nodeCrypto.createHash('sha256').update(data).digest('hex');
  }
}

/**
 * Branchless environmental live key derivation with dynamic session salting.
 */
export function deriveLiveKeyFromEnv(): number {
  const isDocPresent = Number(typeof globalThis.document !== 'undefined');
  const doc = (isDocPresent * 1 && globalThis.document) || { querySelector: () => null, body: { outerHTML: 'aegis-node-dom' } };

  const rootEl = doc.querySelector('#aegis-root') || doc.body || { outerHTML: 'aegis-fallback-dom' };
  const aegisRootHTML = rootEl.outerHTML || 'aegis-fallback-dom';

  const domSeed = fnv1a32(aegisRootHTML);

  const win = globalThis.window || { fetch: () => {} };
  const evtTarget = globalThis.EventTarget || { prototype: { addEventListener: () => {} } };
  const htmlDiv = globalThis.HTMLDivElement || { prototype: { appendChild: () => {} } };

  const fetchStr = String(win.fetch) || 'native';
  const addEvtStr = String(evtTarget.prototype.addEventListener) || 'native';
  const appendChildStr = String(htmlDiv.prototype.appendChild) || 'native';

  const apiConcat = fetchStr + addEvtStr + appendChildStr;
  const apiSeed = fnv1a32(apiConcat);

  let sessionSalt = 0x1337c0de;
  if (typeof globalThis.sessionStorage !== 'undefined') {
    let existingSalt = globalThis.sessionStorage.getItem('__aegis_salt__');
    if (!existingSalt) {
      existingSalt = String(Math.floor(Math.random() * 0xFFFFFFFF));
      try {
        globalThis.sessionStorage.setItem('__aegis_salt__', existingSalt);
      } catch (_) {}
    }
    sessionSalt = fnv1a32(existingSalt);
  }

  const errCls = globalThis.Error || { stackTraceLimit: 10 };
  const stackLimit = errCls.stackTraceLimit || 10;
  const stackSeed = (stackLimit ^ sessionSalt) >>> 0;

  return ((domSeed ^ apiSeed) + Math.imul(stackSeed, 0x9e3779b1)) >>> 0;
}
