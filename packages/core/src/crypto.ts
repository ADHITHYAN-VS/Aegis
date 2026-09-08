import { Instruction } from './types.js';

/**
 * Simple XOR cipher stream operation for Uint8Array or string.
 */
export function xorEncryptDecrypt(data: Uint8Array, key: Uint8Array): Uint8Array {
  const result = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = data[i] ^ key[i % key.length];
  }
  return result;
}

/**
 * Derive AES-GCM Key from a raw string or seed using WebCrypto or Node crypto.
 */
async function deriveKey(seed: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(seed.padEnd(32, '0').slice(0, 32));
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * AES-128-GCM encrypt wrapper using WebCrypto.
 */
export async function encryptAESGCM(plainText: string, secretSeed: string): Promise<{ ciphertext: string; iv: string }> {
  const key = await deriveKey(secretSeed);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const encoded = encoder.encode(plainText);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  return {
    ciphertext: Buffer.from(encryptedBuffer).toString('base64'),
    iv: Buffer.from(iv).toString('base64')
  };
}

/**
 * AES-128-GCM decrypt wrapper using WebCrypto.
 */
export async function decryptAESGCM(ciphertextBase64: string, ivBase64: string, secretSeed: string): Promise<string> {
  const key = await deriveKey(secretSeed);
  const ciphertextBuffer = Buffer.from(ciphertextBase64, 'base64');
  const ivBuffer = Buffer.from(ivBase64, 'base64');

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuffer },
    key,
    ciphertextBuffer
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

export function maskInstructionsWithKey(instructions: Instruction[], baseSeed: number): Instruction[] {
  return instructions.map((instr, idx) => {
    const mask = (baseSeed ^ (idx * 0x45d9f3b)) & 0xFF;
    return {
      opcode: instr.opcode ^ mask,
      arg: instr.arg
    };
  });
}

export function unmaskInstructionWithKey(instr: Instruction, idx: number, liveKey: number): Instruction {
  const mask = (liveKey ^ (idx * 0x45d9f3b)) & 0xFF;
  return {
    opcode: instr.opcode ^ mask,
    arg: instr.arg
  };
}
