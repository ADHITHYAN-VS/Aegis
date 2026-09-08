# Aegis Web-DRM (v1.0)

> Core Motto: "Make every tamper attempt feel like an unexplainable, random browser crash."

Aegis is the world's first Zero-Trust Branchless Web-DRM powered by a Polymorphic Virtual Machine engine.

---

## 🛡️ Architecture & How It Works

```
 ┌────────────────────────────────────────────────────────┐
 │                   Source Code (JS/TS)                  │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │            @aegis/compiler (Polymorphic VM)            │
 └───────────────────────────┬────────────────────────────┘
                             │ Encrypted .aegis Bundle
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │             @aegis/runtime (Browser Execution)          │
 │                                                        │
 │  ┌─────────────────────┐    ┌───────────────────────┐  │
 │  │ Branchless Verifier  ├─┬──► AegisVM Interpreter  │  │
 │  │ (DOM/API/Stack Trait)│ │  │ (Indirect Jump Table) │  │
 │  └─────────────────────┘ │  └───────────────────────┘  │
 │                          │                             │
 │  ┌─────────────────────┐ │  ┌───────────────────────┐  │
 │  │ Active Sentinel     ├─┴──► Adaptive Responder    │  │
 │  │ (Anti-Debug/Hooks)  │    │ (Honeypot / Lock)     │  │
 │  └─────────────────────┘    └───────────────────────┘  │
 └────────────────────────────────────────────────────────┘
```

Aegis completely eliminates `if (isTampered) { crash(); }` conditional branch checks. Instead, real-time environment traits (DOM structure, Web API signatures, stack depth) generate a live 32-bit cryptographic key. If an attacker tampers with the DOM or hooks browser APIs, the generated live key breaks, causing the VM to unmask garbage opcodes and logically collapse.

---

## 📥 Installation

```bash
npm install -g @aegis/compiler
# Or install in your project
pnpm add @aegis/runtime @aegis/core
```

## 🚀 Quick Start Guide

### 1. Protect Logic with Aegis Compiler CLI
```bash
aegis build ./app.js -o ./output.aegis --seed "your-secret-seed"
```

### 2. Load & Execute Securely in the Browser
```html
<script src="node_modules/@aegis/runtime/dist/index.global.js"></script>
<script>
  const { AegisLoader } = window.AegisRuntime;
  const loader = new AegisLoader();
  loader.startSentinel();

  loader.loadAndExecute('./output.aegis', 'your-secret-seed')
    .then(result => console.log('Secure VM execution result:', result));
</script>
```

---

## 📖 API Documentation

### `@aegis/compiler`
- `parseJS(code: string)`: Parses JS source into a Babel AST.
- `generatePolymorphicOpcodeMap()`: Generates random opcode mappings per build.
- `compileASTToBytecode(ast, map)`: Compiles AST into polymorphic VM instructions.

### `@aegis/runtime`
- `AegisLoader(policy?: AegisPolicy)`: Bootstraps and executes Aegis bundles.
- `BranchlessVerifier`: Derives live 32-bit unsigned integer keys without conditional branch keywords.
- `AegisVM`: Executes VM instruction sets dispatched through an indirect jump table.
- `Sentinel`: Cyclic anti-debugging and API hook monitoring.

For commercial licenses and Cloud Builder options, see `MONETIZATION_STRATEGY.md`.
