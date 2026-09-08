import { describe, it, expect } from 'vitest';
import {
  fnv1a32,
  fnv1a64,
  sha256,
  encryptAESGCM,
  decryptAESGCM,
  maskInstructionsWithKey,
  unmaskInstructionWithKey,
  deriveLiveKeyFromEnv,
  Instruction
} from '@aegis/core';

describe('@aegis/core Unit Tests', () => {
  it('computes FNV-1a 32-bit and 64-bit hashes deterministically', () => {
    const input = 'hello-aegis';
    const hash32_1 = fnv1a32(input);
    const hash32_2 = fnv1a32(input);
    expect(hash32_1).toBe(hash32_2);
    expect(typeof hash32_1).toBe('number');

    const hash64_1 = fnv1a64(input);
    const hash64_2 = fnv1a64(input);
    expect(hash64_1).toBe(hash64_2);
    expect(typeof hash64_1).toBe('bigint');
  });

  it('computes SHA-256 hash', async () => {
    const hash = await sha256('test-data');
    expect(hash).toHaveLength(64);
  });

  it('encrypts and decrypts AES-128-GCM data correctly', async () => {
    const seed = 'secret-aegis-key';
    const plainText = '{"action":"grant_access","user":"admin"}';

    const encrypted = await encryptAESGCM(plainText, seed);
    expect(encrypted.ciphertext).not.toBe(plainText);
    expect(encrypted.iv).toBeDefined();

    const decrypted = await decryptAESGCM(encrypted.ciphertext, encrypted.iv, seed);
    expect(decrypted).toBe(plainText);
  });

  it('masks and unmasks instructions deterministically using key', () => {
    const rawInstructions: Instruction[] = [
      { opcode: 0x01, arg: 10 },
      { opcode: 0x03, arg: null },
      { opcode: 0xFF, arg: null }
    ];
    const key = 0x12345678;

    const masked = maskInstructionsWithKey(rawInstructions, key);
    expect(masked[0].opcode).not.toBe(rawInstructions[0].opcode);

    const unmasked0 = unmaskInstructionWithKey(masked[0], 0, key);
    expect(unmasked0.opcode).toBe(rawInstructions[0].opcode);
  });

  it('derives live key from environment state without throwing', () => {
    const key = deriveLiveKeyFromEnv();
    expect(typeof key).toBe('number');
    expect(isNaN(key)).toBe(false);
  });
});
