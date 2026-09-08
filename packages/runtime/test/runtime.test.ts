/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { BranchlessVerifier, AegisLoader } from '@aegis/runtime';
import { generatePolymorphicOpcodeMap } from '@aegis/compiler';
import { encryptAESGCM, maskInstructionsWithKey } from '@aegis/core';

describe('@aegis/runtime Unit & Integration Tests', () => {
  let verifier: BranchlessVerifier;

  beforeEach(() => {
    document.body.innerHTML = '<div id="aegis-root"><span>Initial DOM</span></div>';
    verifier = new BranchlessVerifier();
  });

  it('verifier.ts isolated test: DOM modification changes derived live key', () => {
    const verifierSourcePath = path.resolve(__dirname, '../src/verifier.ts');
    const verifierSource = fs.readFileSync(verifierSourcePath, 'utf-8');

    const methodMatch = verifierSource.match(/deriveLiveKey\s*\(\)\s*:\s*number\s*\{([\s\S]*?)\n  \}/);
    expect(methodMatch).not.toBeNull();
    const methodBody = methodMatch![1];

    expect(methodBody).not.toMatch(/\bif\b/);
    expect(methodBody).not.toMatch(/\bswitch\b/);
    expect(methodBody).not.toMatch(/===/);
    expect(methodBody).not.toMatch(/!==/);

    const key1 = verifier.deriveLiveKey();

    const rootEl = document.querySelector('#aegis-root')!;
    rootEl.id = 'aegis-root-tampered';

    const key2 = verifier.deriveLiveKey();

    expect(key1).not.toBe(key2);
  });

  it('end-to-end VM execution via AegisLoader and key break on tamper', async () => {
    const opcodeMap = generatePolymorphicOpcodeMap();
    const constants = ['add'];
    const instructions = [
      { opcode: opcodeMap['PUSH'], arg: 1 },
      { opcode: opcodeMap['PUSH'], arg: 2 },
      { opcode: opcodeMap['CALL'], arg: 0 },
      { opcode: opcodeMap['RET'] }
    ];

    const liveKey = verifier.deriveLiveKey();
    const maskedInstructions = maskInstructionsWithKey(instructions, liveKey);

    const seed = 'test-seed-123';
    const rawChunk = {
      version: '1.0.0',
      buildSeed: seed,
      opcodeMap,
      instructions: maskedInstructions,
      constants
    };

    const encrypted = await encryptAESGCM(JSON.stringify(rawChunk), seed);
    const bundle = {
      version: '1.0.0',
      buildSeed: seed,
      encryptedData: encrypted.ciphertext,
      iv: encrypted.iv
    };

    const loader = new AegisLoader();
    const result = await loader.loadAndExecute(bundle, seed);
    expect(result).toBe(3);

    // Tamper with DOM to break derived key unmasking in VM
    document.body.innerHTML = '<div id="tampered"><span>Tampered DOM</span></div>';
    const tamperedResult = await loader.loadAndExecute(bundle, seed);
    expect(tamperedResult).toBeNull();
  });
});
