import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@aegis/core': path.resolve(__dirname, './packages/core/src/index.ts'),
      '@aegis/compiler': path.resolve(__dirname, './packages/compiler/src/index.ts'),
      '@aegis/runtime': path.resolve(__dirname, './packages/runtime/src/index.ts')
    }
  }
});
