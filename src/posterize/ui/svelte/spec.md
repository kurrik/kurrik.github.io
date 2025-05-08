# Svelte UI Architecture

## Overview

This document outlines the architecture for the Svelte-based UI layer of the Posterize application, following Domain-Driven Design principles. The Svelte implementation maintains strict boundaries between the UI, application, and domain layers while leveraging Svelte's reactivity system.

## Core Architecture

The Svelte UI implementation follows these key principles:

1. **Maintain Domain Integrity**: All domain logic remains in the domain layer, completely separated from the UI.
2. **Stateless Components**: UI components are primarily presentational, with state managed via domain-appropriate stores.
3. **Reactive Data Flow**: State changes flow unidirectionally from stores to components.

## Structure

```
src/posterize/ui/svelte/
├── components/       # Svelte UI components grouped by domain concepts
├── stores/           # Domain-driven reactive state stores
└── types.d.ts        # TypeScript definitions for Svelte
```

## State Management

Instead of the previous Manager-based approach, the Svelte implementation uses:

- **Domain-specific stores** that correspond to bounded contexts in the domain model
- **Reactive updates** that propagate changes while respecting domain boundaries
- **Event-based communication** for cross-component interactions that mirrors the domain events

### State Store Pattern

The primary state management is through `posterizeState.ts`, which encapsulates:

1. A reactive store that wraps the domain's `StateManagementService`
2. State update methods that maintain domain integrity
3. Derived stores for specific aspects of the state

This approach replaces the previous `BaseManager` functionality while maintaining proper domain boundaries.

## Component Structure

Svelte components correspond to domain concepts rather than technical functions. Each component:

1. Subscribes to the relevant parts of the state
2. Renders based on the current state
3. Dispatches domain events when user actions occur
4. Uses lifecycle hooks (`onMount`, `onDestroy`) to handle initialization and cleanup

### Component Mapping

| Domain Concept | Component |
|---------------|-----------|
| Image Processing | `Image.svelte` |
| Vector Preview | `VectorPreview.svelte` |
| Color Controls | `ColorControls.svelte` |
| ... | ... |

## Migration Strategy

The system is being incrementally migrated from the TypeScript-based Manager pattern to Svelte components:

1. Each Manager is replaced by a corresponding Svelte component
2. The `BaseManager` functionality is provided through the state store
3. DOM manipulation is replaced with declarative Svelte templates
4. Event listeners are replaced with Svelte's event directives

During the transition period, some hybrid approaches may be used to ensure system integrity while the migration progresses.

## Testing Approach

Components should be tested in isolation using component testing techniques appropriate for Svelte, focusing on:

1. Correct rendering based on props and store state
2. Proper event handling
3. Lifecycle management
4. Integration with domain services
