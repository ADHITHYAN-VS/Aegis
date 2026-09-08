import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AegisVM } from '../src/vm';
import { BranchlessVerifier } from '../src/verifier';
import { AdaptiveResponder } from '../src/responder';
import { maskInstructionsWithKey, unmaskInstructionWithKey } from '@aegis/core';

describe('@aegis/runtime - AegisVM', () => {
  let mockPolicy: any;

  beforeEach(() => {
    mockPolicy = {
      level1_honeypot: true,
      level2_lock: true,
      level3_selfdestruct: false,
      whitelisted_extensions: [],
    };
    // Reset DOM for tests
    document.body.innerHTML = '<div id="aegis-root">Test</div>';
  });

  it('should execute simple arithmetic (PUSH, ADD, POP, RET) correctly', () => {
    // Program: PUSH 5, PUSH 3, ADD, RET (expect 8)
    // Encoded with a known key (we use a fixed key for testing)
    const testKey = 0xAA;
    const rawInstructions = new Uint8Array([0x01, 0x05, 0x01, 0x03, 0x03, 0x06]);
    const encrypted = maskInstructionsWithKey(rawInstructions, testKey);

    // Mock the verifier to return our test key
    const mockVerifier = BranchlessVerifier.getInstance();
    vi.spyOn(mockVerifier, 'deriveLiveKeyFromEnv').mockReturnValue(testKey);

    const vm = new AegisVM(encrypted, mockPolicy);
    const result = vm.execute();

    expect(result).toBe(8);
  });

  it('should trigger AdaptiveResponder Level 2 when instruction decryption fails (tampered environment)', () => {
    // Program: PUSH 1, RET
    const rawInstructions = new Uint8Array([0x01, 0x01, 0x06]);
    const correctKey = 0xAA;
    const tamperedKey = 0xBB; // Different key = wrong environment

    const encrypted = maskInstructionsWithKey(rawInstructions, correctKey);

    // Mock the verifier to return the WRONG key (simulating DOM tampering)
    const mockVerifier = BranchlessVerifier.getInstance();
    vi.spyOn(mockVerifier, 'deriveLiveKeyFromEnv').mockReturnValue(tamperedKey);

    // Spy on the responder
    const responder = AdaptiveResponder.getInstance();
    const level2Spy = vi.spyOn(responder, 'triggerLevel2');

    const vm = new AegisVM(encrypted, mockPolicy);
    vm.execute();

    expect(level2Spy).toHaveBeenCalled();
  });

  it('should handle HALT opcode gracefully', () => {
    // Program: HALT
    const rawInstructions = new Uint8Array([0x0B]);
    const key = 0xAA;
    const encrypted = maskInstructionsWithKey(rawInstructions, key);

    const mockVerifier = BranchlessVerifier.getInstance();
    vi.spyOn(mockVerifier, 'deriveLiveKeyFromEnv').mockReturnValue(key);

    const vm = new AegisVM(encrypted, mockPolicy);
    const result = vm.execute();

    expect(result).toBeUndefined(); // HALT returns nothing
  });
});
