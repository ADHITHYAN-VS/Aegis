// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AegisVM } from '../src/vm';
import { BranchlessVerifier } from '../src/verifier';
import { AdaptiveResponder } from '../src/responder';
import { maskInstructionsWithKey, unmaskInstructionWithKey } from '@aegis/core';

describe('@aegis/runtime - AegisVM', () => {
  let verifier: BranchlessVerifier;
  let responder: AdaptiveResponder;

  beforeEach(() => {
    document.body.innerHTML = '<div id="aegis-root"><span>Test DOM</span></div>';
    verifier = new BranchlessVerifier();
    responder = new AdaptiveResponder({
      level1_honeypot: true,
      level2_lock: true,
      level3_selfdestruct: false,
      whitelisted_extensions: []
    });
  });

  it('should execute simple arithmetic (PUSH, ADD, POP, RET) correctly', () => {
    const liveKey = verifier.deriveLiveKey();
    const opcodeMap = { PUSH: 1, ADD: 2, POP: 3, RET: 4 };

    const rawInstructions = [
      { opcode: opcodeMap['PUSH'], arg: 5 },
      { opcode: opcodeMap['PUSH'], arg: 3 },
      { opcode: opcodeMap['ADD'] },
      { opcode: opcodeMap['RET'] }
    ];

    const maskedInstructions = maskInstructionsWithKey(rawInstructions, liveKey);
    const chunk = {
      version: '1.0.0',
      buildSeed: 'test-seed',
      opcodeMap,
      instructions: maskedInstructions,
      constants: []
    };

    const vm = new AegisVM(responder);
    const result = vm.execute(chunk);

    expect(result).toBe(8);
  });

  it('should trigger AdaptiveResponder Level 1 honeypot when instruction decryption fails (tampered environment)', () => {
    const liveKey = verifier.deriveLiveKey();
    const opcodeMap = { PUSH: 1, RET: 2 };

    const rawInstructions = [
      { opcode: opcodeMap['PUSH'], arg: 1 },
      { opcode: opcodeMap['RET'] }
    ];

    // Mask with wrong key to simulate unmasking failure
    const maskedInstructions = maskInstructionsWithKey(rawInstructions, liveKey + 123);
    const chunk = {
      version: '1.0.0',
      buildSeed: 'test-seed',
      opcodeMap,
      instructions: maskedInstructions,
      constants: []
    };

    const honeypotSpy = vi.spyOn(responder, 'triggerLevel1Honeypot');

    const vm = new AegisVM(responder);
    const result = vm.execute(chunk);

    expect(result).toBeNull();
    expect(honeypotSpy).toHaveBeenCalled();
  });

  it('should handle HALT opcode gracefully', () => {
    const liveKey = verifier.deriveLiveKey();
    const opcodeMap = { HALT: 99 };

    const rawInstructions = [
      { opcode: opcodeMap['HALT'] }
    ];

    const maskedInstructions = maskInstructionsWithKey(rawInstructions, liveKey);
    const chunk = {
      version: '1.0.0',
      buildSeed: 'test-seed',
      opcodeMap,
      instructions: maskedInstructions,
      constants: []
    };

    const vm = new AegisVM(responder);
    const result = vm.execute(chunk);

    expect(result).toBeUndefined(); // HALT with empty stack returns undefined
  });
});
