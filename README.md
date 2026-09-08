# Aegis Web-DRM (v1.0)

> Core Motto: "Make every tamper attempt feel like an unexplainable, random browser crash."

Aegis is the world's first Zero-Trust Branchless Web-DRM powered by a Polymorphic Virtual Machine engine.

## Installation

```bash
npm install -g @aegis/compiler
# Or install in your project
pnpm add @aegis/runtime @aegis/core
```

## Quick Start

### 1. Compile JavaScript logic with Aegis Compiler
```bash
aegis build ./app.js -o ./output.aegis --seed "your-secret-seed"
```

### 2. Deploy and Load in the Browser
```html
<script src="node_modules/@aegis/runtime/dist/index.global.js"></script>
<script>
  const { AegisLoader } = window.AegisRuntime;
  const loader = new AegisLoader();
  loader.startSentinel();

  loader.loadAndExecute('./output.aegis', 'your-secret-seed')
    .then(result => console.log('Execution result:', result));
</script>
```

For full commercial licensing and cloud builder options, visit the Cloud Platform.
