export interface AegisPolicy {
  level1_honeypot: boolean;
  level2_lock: boolean;
  level3_selfdestruct: boolean;
  whitelisted_extensions: string[];
}

export const DEFAULT_AEGIS_POLICY: AegisPolicy = {
  level1_honeypot: true,
  level2_lock: true,
  level3_selfdestruct: false,
  whitelisted_extensions: []
};

export enum CoreOpcode {
  NOP = 0x00,
  PUSH = 0x01,
  POP = 0x02,
  ADD = 0x03,
  SUB = 0x04,
  CALL = 0x05,
  RET = 0x06,
  JMP = 0x07,
  JE = 0x08,
  LOAD = 0x09,
  STORE = 0x0A,
  HALT = 0xFF
}

export type PolymorphicOpcodeMap = Record<string, number>;

export interface Instruction {
  opcode: number;
  arg?: number | string | boolean | null;
}

export interface IBytecodeChunk {
  version: string;
  buildSeed: string;
  opcodeMap: PolymorphicOpcodeMap;
  instructions: Instruction[];
  constants: any[];
  encryptedData?: string;
  iv?: string;
}
