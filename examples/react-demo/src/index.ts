import { AegisLoader } from '@aegis/runtime';

export async function runReactDemo() {
  const loader = new AegisLoader({ level1_honeypot: true });
  loader.startSentinel();

  const dummyBundle = {
    version: '1.0.0',
    buildSeed: 'react-seed',
    opcodeMap: { NOP: 0, PUSH: 1, POP: 2, ADD: 3, SUB: 4, CALL: 5, RET: 6, HALT: 255 },
    instructions: [
      { opcode: 1, arg: 100 },
      { opcode: 1, arg: 50 },
      { opcode: 4 },
      { opcode: 255 }
    ],
    constants: []
  };

  return await loader.loadAndExecute(dummyBundle, 'react-seed');
}
