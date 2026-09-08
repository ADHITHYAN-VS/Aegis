import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import * as t from '@babel/types';

// Handle ESM/CJS interop for @babel/traverse
const traverse = (typeof _traverse === 'function' ? _traverse : (_traverse as any).default) as typeof _traverse;

export function parseJS(code: string): t.File {
  return parse(code, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx']
  });
}

export { traverse, t };
