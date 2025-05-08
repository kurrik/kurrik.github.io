# Posterize App - Svelte Component Migration Plan

## Overview

This document outlines the plan to convert the existing TypeScript classes in the Posterize app's UI layer to Svelte components while preserving our Domain-Driven Design architecture.

## Phase 1: Configure Svelte in the Project

### 1.1 Install Dependencies

```bash
# Install Svelte and related tools
npm install --save-dev svelte svelte-preprocess @sveltejs/vite-plugin-svelte
# Add TypeScript support
npm install --save-dev @tsconfig/svelte
```

### 1.2 Configure Vite for Svelte

Update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import { resolve } from 'path';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  root: '.',
  base: '/posterize/',
  plugins: [svelte()],
  build: {
    outDir: resolve(__dirname, '../../dist/posterize'),
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    open: '/posterize/index.html',
    port: 3000,
  },
});
```

### 1.3 Create Svelte-specific TypeScript Configuration

Create a new `tsconfig.svelte.json` in the posterize directory:

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "isolatedModules": true,
    "types": ["svelte"]
  },
  "include": ["**/*.ts", "**/*.svelte"],
  "exclude": ["node_modules", "../../dist", "**/vite.config.ts"]
}
```

### 1.4 Setup Svelte Folder Structure

We'll maintain our DDD structure while incorporating Svelte components:

```
src/posterize/
├── domain/             # Domain model - unchanged
├── application/        # Application services - unchanged
├── infrastructure/     # Infrastructure adapters - unchanged
├── ui/
│   ├── components/     # Original TS components (to be migrated)
│   └── svelte/         # New Svelte components
│       ├── components/ # Svelte UI components following DDD boundaries
│       ├── stores/     # Svelte stores for managing UI state
│       └── utils/      # Svelte-specific utilities
└── types/              # TypeScript type definitions
```

## Phase 2: Component Migration Strategy

### 2.1 Mapping Strategy

Each existing manager class will be mapped to a corresponding Svelte component:

| Current TypeScript Class | Svelte Component Equivalent |
|-------------------------|----------------------------|
| `BaseManager` | `Base.svelte` - with common functionality extracted to a helper file |
| `ImageManager` | `Image.svelte` |
| `ControlManager` | `Control.svelte` |
| `PreviewManager` | `Preview.svelte` |
| `VectorControlManager` | `VectorControl.svelte` |
| ... | ... |

### 2.2 Preserving Domain Logic

- Domain and application services will remain untouched in their respective layers
- Services will be injected into Svelte components via props or context
- We'll leverage Svelte stores for cross-component state that respects domain boundaries

### 2.3 DOM Manipulation Conversion Guidelines

| Current Pattern | Svelte Pattern |
|-----------------|---------------|
| `createElement` calls | Svelte declarative markup |
| `addEventListener` | Svelte event directives (`on:click`, etc.) |
| Direct DOM updates | Reactive variables, `bind:` directives |
| Class methods | Component methods or store actions |
| State variables | Reactive variables with `$:` declarations |

### 2.4 Implementation Order

1. Setup basic Svelte infrastructure and test integration
2. Convert simpler, independent components first
3. Progress to more complex, dependent components
4. Recommended sequence:
   - BaseManager → ImageManager → ControlManager → PreviewManager → VectorControlManager

## Phase 3: Detailed Implementation Plan

For each component conversion:

1. **Create Svelte Component Shell**:
   - Create the `.svelte` file with appropriate structure
   - Define props that mirror constructor parameters
   - Identify which manager methods should be exported as component methods

2. **State Migration**:
   - Extract component state from class properties to Svelte reactive variables
   - Set up appropriate Svelte stores for shared state

3. **Template Conversion**:
   - Convert DOM creation logic to Svelte markup
   - Replace imperative DOM updates with reactive Svelte patterns
   - Implement slot system for composable components

4. **Event Handler Migration**:
   - Transform event listeners to Svelte event directives
   - Maintain existing business logic functionality

5. **Testing**:
   - Test each component in isolation
   - Ensure compatibility with domain services

6. **Integration**:
   - Update parent components to use the new Svelte component
   - Ensure proper reactivity and event flow

7. **Cleanup**:
   - Remove original TS class once migration is complete
   - Update references throughout the application

## Example Component Conversion

**Original**: `BaseManager.ts`
```typescript
export class BaseManager {
  protected elements: Record<string, HTMLElement | null> = {};
  
  protected createElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    className?: string,
    textContent?: string
  ): HTMLElementTagNameMap[K] {
    // Implementation...
  }
  
  // Other methods...
}
```

**Converted**: `Base.svelte`
```svelte
<script lang="ts">
  // Props and local state
  export let id: string | undefined = undefined;
  
  // Methods that can be called from parent components
  export function addElement(key: string, element: HTMLElement): void {
    elements[key] = element;
  }
  
  // Local state
  let elements: Record<string, HTMLElement | null> = {};
  
  // Helper function for child components
  function createElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    className?: string,
    textContent?: string
  ): HTMLElementTagNameMap[K] {
    // Implementation...
  }
</script>

<div {id}>
  <slot></slot>
</div>
```

## Final Integration

Once all components are converted, update `posterize.ts` to use the new Svelte components:

```typescript
import App from './ui/svelte/components/App.svelte';

// Initialize the domain and application services
// ...

// Mount the Svelte app
const app = new App({
  target: document.body,
  props: {
    // Inject services
    imageProcessingService,
    stateManagementService,
    // ...
  }
});

export default app;
```
