import { t, traverse } from './parser.js';
import { CoreOpcode, Instruction, PolymorphicOpcodeMap } from '@aegis/core';

export function generatePolymorphicOpcodeMap(): PolymorphicOpcodeMap {
  const opcodes = Object.keys(CoreOpcode).filter(k => isNaN(Number(k)));
  const map: PolymorphicOpcodeMap = {};
  const usedBytes = new Set<number>([0x00, 0xFF]);

  for (const op of opcodes) {
    if (op === 'NOP') {
      map[op] = 0x00;
      continue;
    }
    if (op === 'HALT') {
      map[op] = 0xFF;
      continue;
    }
    let randomByte: number;
    do {
      randomByte = Math.floor(Math.random() * 254) + 1;
    } while (usedBytes.has(randomByte));

    usedBytes.add(randomByte);
    map[op] = randomByte;
  }

  return map;
}

export function compileASTToBytecode(ast: ReturnType<typeof import('./parser.js').parseJS>, opcodeMap: PolymorphicOpcodeMap): { instructions: Instruction[]; constants: any[] } {
  const instructions: Instruction[] = [];
  const constants: any[] = [];

  function addConstant(val: any): number {
    const idx = constants.indexOf(val);
    if (idx !== -1) return idx;
    constants.push(val);
    return constants.length - 1;
  }

  traverse(ast, {
    BinaryExpression(path) {
      if (t.isNumericLiteral(path.node.left)) {
        instructions.push({ opcode: opcodeMap['PUSH'], arg: path.node.left.value });
      } else if (t.isIdentifier(path.node.left)) {
        const cIdx = addConstant(path.node.left.name);
        instructions.push({ opcode: opcodeMap['LOAD'], arg: cIdx });
      }

      if (t.isNumericLiteral(path.node.right)) {
        instructions.push({ opcode: opcodeMap['PUSH'], arg: path.node.right.value });
      } else if (t.isIdentifier(path.node.right)) {
        const cIdx = addConstant(path.node.right.name);
        instructions.push({ opcode: opcodeMap['LOAD'], arg: cIdx });
      }

      if (path.node.operator === '+') {
        instructions.push({ opcode: opcodeMap['ADD'] });
      } else if (path.node.operator === '-') {
        instructions.push({ opcode: opcodeMap['SUB'] });
      }
    },
    CallExpression(path) {
      if (t.isIdentifier(path.node.callee)) {
        const fnNameIdx = addConstant(path.node.callee.name);
        for (const arg of path.node.arguments) {
          if (t.isNumericLiteral(arg)) {
            instructions.push({ opcode: opcodeMap['PUSH'], arg: arg.value });
          } else if (t.isStringLiteral(arg)) {
            const sIdx = addConstant(arg.value);
            instructions.push({ opcode: opcodeMap['PUSH'], arg: sIdx });
          } else if (t.isIdentifier(arg)) {
            const idIdx = addConstant(arg.name);
            instructions.push({ opcode: opcodeMap['LOAD'], arg: idIdx });
          }
        }
        instructions.push({ opcode: opcodeMap['CALL'], arg: fnNameIdx });
      }
    },
    FunctionDeclaration(path) {
      // In minimal AST compiler, compile function body into VM instructions
      if (path.node.body) {
        traverse(path.node.body, {
          BinaryExpression(bPath) {
            if (t.isIdentifier(bPath.node.left) || t.isNumericLiteral(bPath.node.left)) {
              const val = t.isNumericLiteral(bPath.node.left) ? bPath.node.left.value : bPath.node.left.name;
              const idx = addConstant(val);
              instructions.push({ opcode: opcodeMap['LOAD'], arg: idx });
            }
            if (t.isIdentifier(bPath.node.right) || t.isNumericLiteral(bPath.node.right)) {
              const val = t.isNumericLiteral(bPath.node.right) ? bPath.node.right.value : bPath.node.right.name;
              const idx = addConstant(val);
              instructions.push({ opcode: opcodeMap['LOAD'], arg: idx });
            }
            if (bPath.node.operator === '+') {
              instructions.push({ opcode: opcodeMap['ADD'] });
            }
          }
        }, path.scope, path);
      }
    },
    ReturnStatement(path) {
      if (path.node.argument && t.isNumericLiteral(path.node.argument)) {
        instructions.push({ opcode: opcodeMap['PUSH'], arg: path.node.argument.value });
      }
      instructions.push({ opcode: opcodeMap['RET'] });
    }
  });

  instructions.push({ opcode: opcodeMap['HALT'] });

  return { instructions, constants };
}
