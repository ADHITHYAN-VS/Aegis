import { fnv1a32, deriveLiveKeyFromEnv } from '@aegis/core';

/**
 * Layer 2: The Branchless Integrity Verifier Engine
 */
export class BranchlessVerifier {
  public deriveLiveKey(): number {
    return deriveLiveKeyFromEnv();
  }
}
