import { describe, it, expect } from 'vitest';
import { fnv1a32, fnv1a64, encryptAESGCM, decryptAESGCM } from '@aegis/core';

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

  it('encrypts and decrypts AES-128-GCM data correctly', async () => {
    const seed = 'secret-aegis-key';
    const plainText = '{"action":"grant_access","user":"admin"}';

    const encrypted = await encryptAESGCM(plainText, seed);
    expect(encrypted.ciphertext).not.toBe(plainText);
    expect(encrypted.iv).toBeDefined();

    const decrypted = await decryptAESGCM(encrypted.ciphertext, encrypted.iv, seed);
    expect(decrypted).toBe(plainText);
  });
});
