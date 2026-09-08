import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { parseJS } from './parser.js';
import { compileASTToBytecode, generatePolymorphicOpcodeMap } from './bytecodeGen.js';
import { optimizeBytecode } from './optimizer.js';
import { encryptAESGCM, IBytecodeChunk, maskInstructionsWithKey, deriveLiveKeyFromEnv } from '@aegis/core';

export function runCLI(args: string[] = process.argv) {
  const program = new Command();

  program
    .name('aegis')
    .description('Aegis Web-DRM Compiler CLI')
    .version('1.0.0');

  program
    .command('build')
    .argument('<entry>', 'JavaScript entry file to compile')
    .option('-o, --output <path>', 'Output .aegis bundle file path', './bundle.aegis')
    .option('-s, --seed <string>', 'Build seed for encryption key', 'aegis-secret-seed')
    .action(async (entry: string, options: { output: string; seed: string }) => {
      try {
        const sourceCode = fs.readFileSync(path.resolve(entry), 'utf-8');
        const ast = parseJS(sourceCode);
        const opcodeMap = generatePolymorphicOpcodeMap();
        const { instructions, constants } = compileASTToBytecode(ast, opcodeMap);
        const optimizedInstructions = optimizeBytecode(instructions, opcodeMap);

        const targetEnvKey = deriveLiveKeyFromEnv();
        const maskedInstructions = maskInstructionsWithKey(optimizedInstructions, targetEnvKey);

        const rawChunk: IBytecodeChunk = {
          version: '1.0.0',
          buildSeed: options.seed,
          opcodeMap,
          instructions: maskedInstructions,
          constants
        };

        const encrypted = await encryptAESGCM(JSON.stringify(rawChunk), options.seed);

        const finalBundle = {
          version: '1.0.0',
          buildSeed: options.seed,
          encryptedData: encrypted.ciphertext,
          iv: encrypted.iv
        };

        fs.writeFileSync(path.resolve(options.output), JSON.stringify(finalBundle, null, 2));
        console.log(`[Aegis Compiler] Successfully compiled ${entry} -> ${options.output}`);
      } catch (err) {
        console.error('[Aegis Compiler] Error during compilation:', err);
        process.exit(1);
      }
    });

  program.parse(args);
}

if (process.argv[1] && process.argv[1].endsWith('cli.js')) {
  runCLI();
}
