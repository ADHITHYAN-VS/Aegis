import { Instruction, PolymorphicOpcodeMap } from '@aegis/core';

export function optimizeBytecode(instructions: Instruction[], opcodeMap: PolymorphicOpcodeMap): Instruction[] {
  const optimized: Instruction[] = [];

  for (let i = 0; i < instructions.length; i++) {
    const current = instructions[i];

    // Dead code elimination: Remove consecutive NOPs
    if (current.opcode === opcodeMap['NOP']) {
      if (optimized.length > 0 && optimized[optimized.length - 1].opcode === opcodeMap['NOP']) {
        continue;
      }
    }

    optimized.push(current);
  }

  return optimized;
}
