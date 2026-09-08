import { describe, it, expect } from 'vitest';
import { parseJS, generatePolymorphicOpcodeMap, compileASTToBytecode, optimizeBytecode } from '@aegis/compiler';

describe('@aegis/compiler Unit Tests', () => {
  it('generates polymorphic opcodes without collisions', () => {
    const map = generatePolymorphicOpcodeMap();
    const values = Object.values(map);
    const uniqueValues = new Set(values);

    expect(values.length).toBe(uniqueValues.size);
    expect(map['NOP']).toBe(0x00);
    expect(map['HALT']).toBe(0xFF);
  });

  it('compiles simple JS expression to polymorphic bytecode', () => {
    const code = 'function add(a, b) { return a + b; } add(10, 20);';
    const ast = parseJS(code);
    const opcodeMap = generatePolymorphicOpcodeMap();

    const { instructions, constants } = compileASTToBytecode(ast, opcodeMap);
    const optimized = optimizeBytecode(instructions, opcodeMap);

    expect(optimized.length).toBeGreaterThan(0);
    expect(optimized[optimized.length - 1].opcode).toBe(opcodeMap['HALT']);
    expect(constants).toContain('add');
  });
});
