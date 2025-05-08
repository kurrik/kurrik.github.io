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
│       └── stores/     # Domain-specific stores for state management
└── types/              # TypeScript type definitions
```

## Phase 2: Component Migration Strategy

### 2.1 Revised Mapping Strategy

After analyzing how the components are used, we have a clearer migration strategy:

1. **BaseManager → Svelte Store**:
   - `BaseManager` is not a UI component but an orchestration layer
   - We'll migrate its functionality to a domain-appropriate Svelte store

2. **UI Managers → Svelte Components**:
   Each concrete manager class will be mapped to a corresponding Svelte component:

| Current TypeScript Class | Svelte Component Equivalent |
|-------------------------|----------------------------|
| `ImageManager` | `Image.svelte` |
| `PreviewManager` | `Preview.svelte` |
| `VectorControlManager` | `VectorControl.svelte` |
| `ColorControlManager` | `ColorControl.svelte` |
| ... | ... |

### 2.2 Preserving Domain Logic

- Domain and application services will remain untouched in their respective layers
- Services will be injected into Svelte components via props or context API
- We'll replace `BaseManager` with domain-specific Svelte stores that maintain proper DDD boundaries
- The state management and event communication will follow the same patterns as before, but leveraging Svelte's reactivity

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
2. Create the core state store to replace `BaseManager` functionality
3. Convert simpler, independent components first
4. Progress to more complex, dependent components
5. Recommended sequence:
   - State Store → ImageManager → Individual Control Managers → PreviewManager → VectorControlManager

## Phase 3: Detailed Implementation Plan

### 3.1 Core State Store Implementation

1. **Create Svelte State Store**:
   - Create a domain-specific store that replaces `BaseManager` functionality
   - Implement state management methods that maintain the same interface/contract
   - Add reactive state handling for UI updates

```typescript
// ui/svelte/stores/posterizeState.ts
import { writable, derived } from 'svelte/store';
import type { AppState } from '../../../types/interfaces';
import { StateManagementService } from '../../../application/services/state-management-service';

export function createPosterizeStore(stateService: StateManagementService) {
  const { subscribe, set, update } = writable<AppState>(stateService.getDefaultState());
  
  return {
    subscribe,
    updateState: (state: AppState) => {
      set(state);
      stateService.saveState(state);
    },
    // Other methods can be added as needed
  };
}
```

### 3.2 Component Migration Process

For each UI manager component:

1. **Create Svelte Component**:
   - Create the `.svelte` file with appropriate structure
   - Define props for required services (matching constructor parameters)
   - Use the central state store for shared state

2. **State Migration**:
   - Move local state to Svelte reactive variables
   - Subscribe to the central store for app state

3. **Template Conversion**:
   - Convert DOM creation logic to Svelte markup
   - Use Svelte's reactive assignments instead of imperative DOM updates

4. **Event Handler Migration**:
   - Use Svelte event directives (`on:click`, etc.) for local events
   - Use Svelte's event dispatcher or custom events for cross-component communication
   - Maintain existing business logic functionality

5. **Lifecycle Handling**:
   - Use Svelte's `onMount` for `initialize()` and `bindEvents()` functionality
   - Use Svelte's reactivity (`$:`) for `updateControls()` functionality

6. **Testing & Integration**:
   - Test each component in isolation
   - Integrate with parent components
   - Verify proper state flow and event handling

7. **Cleanup**:
   - Remove original TS class once migration is complete

## Example Implementations

### State Store (replacing BaseManager)

```typescript
// ui/svelte/stores/posterizeState.ts
import { writable, derived } from 'svelte/store';
import type { AppState } from '../../../types/interfaces';
import { StateManagementService } from '../../../application/services/state-management-service';

export function createPosterizeStore(stateService: StateManagementService) {
  const { subscribe, set, update } = writable<AppState>(stateService.getDefaultState());
  
  return {
    subscribe,
    updateState: (state: AppState) => {
      set(state);
      stateService.saveState(state);
    },
    // Additional methods as needed
  };
}

// Create and export the store instance
export const posterizeState = createPosterizeStore(new StateManagementService());
```

### Example Component Conversion (VectorControlManager)

**Original**: `VectorControlManager.ts` (partial)
```typescript
export class VectorControlManager extends BaseManager implements IVectorControlManager {
  private lastVectorOutput: VectorOutput | null = null;
  protected elements: Record<string, HTMLElement | null> = {};

  // ...
  
  protected initializeElementReferences(): void {
    this.elements.vectorPreviewContainer = document.getElementById('vectorPreviewContainer');
    // ...
  }
  
  public bindEvents(): void {
    document.addEventListener('posterize:vectorUpdated', (event) => {
      const customEvent = event as CustomEvent<VectorOutput>;
      this.renderVectorPreview(customEvent.detail);
    });
  }
}
```

**Converted**: `VectorControl.svelte`
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { posterizeState } from '../stores/posterizeState';
  import type { VectorOutput, StrategyType } from '../../../types/interfaces';
  import { VectorOutputService } from '../../../application/services/vector-output-service';
  
  // Injected services
  export let vectorOutputService: VectorOutputService;
  
  // Local state
  let lastVectorOutput: VectorOutput | null = null;
  let vectorPreviewContainer: HTMLElement | null = null;
  
  // Methods
  function renderVectorPreview(vectorOutput: VectorOutput) {
    lastVectorOutput = vectorOutput;
    // Implementation using Svelte's declarative approach
  }
  
  // Lifecycle - replaces initialize() and bindEvents()
  onMount(() => {
    vectorPreviewContainer = document.getElementById('vectorPreviewContainer');
    
    // Event listeners
    const handleVectorUpdated = (event: CustomEvent<VectorOutput>) => {
      renderVectorPreview(event.detail);
    };
    
    document.addEventListener('posterize:vectorUpdated', 
      handleVectorUpdated as EventListener);
    
    return () => {
      // Cleanup event listeners on component destroy
      document.removeEventListener('posterize:vectorUpdated', 
        handleVectorUpdated as EventListener);
    };
  });
</script>

<!-- Markup that replaces DOM creation code -->
<div id="vectorPreview">
  {#if lastVectorOutput}
    <!-- Render SVG content here declaratively -->
  {/if}
</div>
```

## Final Integration

Once all components are converted, update `posterize.ts` to use the new Svelte components:

```typescript
import App from './ui/svelte/components/App.svelte';

// Initialize the domain and application services
import { ImageProcessingService } from './application/services/image-processing-service';
import { StateManagementService } from './application/services/state-management-service';
import { VectorOutputService } from './application/services/vector-output-service';

// Initialize services
const stateManagementService = new StateManagementService();
const imageProcessingService = new ImageProcessingService();
const vectorOutputService = new VectorOutputService();

// Mount the Svelte app
const app = new App({
  target: document.getElementById('app') || document.body,
  props: {
    // Inject services - preserving our DDD architecture
    stateManagementService,
    imageProcessingService,
    vectorOutputService,
  }
});

export default app;
```

## Testing and Validation

To ensure that our migration maintains the same functionality:

1. Create a comprehensive test plan that covers all features
2. Migrate components incrementally and test each one individually
3. Compare behavior with the original implementation
4. Ensure that all domain logic and business rules remain intact
5. Verify that the UI behaves the same way as before

## Benefits of This Approach

1. **Maintains DDD Architecture**: All domain logic remains in appropriate layers
2. **Improves UI Reactivity**: Leverages Svelte's reactive programming model
3. **Reduces Boilerplate**: Less manual DOM manipulation and event handling
4. **Better State Management**: Uses Svelte stores for predictable state flow
