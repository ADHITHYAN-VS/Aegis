import { IBytecodeChunk, unmaskInstructionWithKey } from '@aegis/core';
import { BranchlessVerifier } from './verifier.js';
import { AdaptiveResponder } from './responder.js';

export class AegisVM {
  private verifier: BranchlessVerifier;
  private responder: AdaptiveResponder;
  private stack: any[] = [];
  private variables: Map<string, any> = new Map();
  private instructionPointer = 0;

  constructor(responder: AdaptiveResponder) {
    this.verifier = new BranchlessVerifier();
    this.responder = responder;
  }

  public execute(chunk: IBytecodeChunk): any {
    const { opcodeMap, instructions, constants } = chunk;
    const revMap = new Map<number, string>();
    for (const [k, v] of Object.entries(opcodeMap)) {
      revMap.set(v, k);
    }

    this.stack = [];
    this.instructionPointer = 0;

    while (this.instructionPointer < instructions.length) {
      const liveKey = this.verifier.deriveLiveKey();

      const maskedInstr = instructions[this.instructionPointer];
      const instr = unmaskInstructionWithKey(maskedInstr, this.instructionPointer, liveKey);

      const opName = revMap.get(instr.opcode);

      switch (opName) {
        case 'NOP':
          break;
        case 'PUSH':
          this.stack.push(instr.arg);
          break;
        case 'POP':
          this.stack.pop();
          break;
        case 'ADD': {
          const b = this.stack.pop();
          const a = this.stack.pop();
          this.stack.push(a + b);
          break;
        }
        case 'SUB': {
          const b = this.stack.pop();
          const a = this.stack.pop();
          this.stack.push(a - b);
          break;
        }
        case 'STORE': {
          const varNameIdx = instr.arg;
          const varName = typeof varNameIdx === 'number' ? constants[varNameIdx] : String(varNameIdx);
          const val = this.stack.pop();
          this.variables.set(varName, val);
          break;
        }
        case 'LOAD': {
          const varNameIdx = instr.arg;
          const varName = typeof varNameIdx === 'number' ? constants[varNameIdx] : String(varNameIdx);
          if (this.variables.has(varName)) {
            this.stack.push(this.variables.get(varName));
          } else if (typeof globalThis !== 'undefined' && (globalThis as any)[varName]) {
            this.stack.push((globalThis as any)[varName]);
          } else {
            this.stack.push(varName);
          }
          break;
        }
        case 'CALL': {
          const fnNameIdx = instr.arg;
          const fnName = typeof fnNameIdx === 'number' ? constants[fnNameIdx] : String(fnNameIdx);

          let targetFn: Function | undefined;
          if (typeof globalThis !== 'undefined' && typeof (globalThis as any)[fnName] === 'function') {
            targetFn = (globalThis as any)[fnName];
          } else if (this.variables.has(fnName) && typeof this.variables.get(fnName) === 'function') {
            targetFn = this.variables.get(fnName);
          }

          if (targetFn) {
            const argCount = targetFn.length || 2;
            const args: any[] = [];
            for (let i = 0; i < argCount; i++) {
              if (this.stack.length > 0) {
                args.unshift(this.stack.pop());
              }
            }
            const res = targetFn(...args);
            this.stack.push(res);
          } else {
            // Function call evaluation
            const b = this.stack.pop();
            const a = this.stack.pop();
            if (a !== undefined && b !== undefined) {
              this.stack.push(a + b);
            }
          }
          break;
        }
        case 'RET':
          return this.stack.pop();
        case 'HALT':
          return this.stack.length > 0 ? this.stack[this.stack.length - 1] : undefined;
        default:
          // Unmasking failed due to tampered environment live key
          this.responder.triggerLevel1Honeypot();
          return null;
      }

      this.instructionPointer++;
    }

    return this.stack.pop();
  }
}
