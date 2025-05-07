# Posterize App - Architecture Specification

## Overview

This document outlines the architecture for refactoring the Posterize application using a lightweight Domain-Driven Design (DDD) approach with TypeScript. The refactored structure will separate concerns, improve maintainability, add type safety, and enable easier extension of features like the upcoming cross-hatching SVG generation for pen plotter drawing.

## Architectural Layers

### 1. Presentation Layer

- **UI Components**: Responsible for rendering and managing UI elements
- **Event Handlers**: Connect UI interactions to application services
- **View Models**: Represent the state required by the UI

### 2. Application Layer

- **Application Services**: Orchestrate the use cases of the application
- **DTOs (Data Transfer Objects)**: Represent data passed between layers
- **Commands & Queries**: Encapsulate user intents and data retrieval needs

### 3. Domain Layer

- **Domain Models**: Core business entities and value objects
- **Domain Services**: Complex operations involving multiple domain models
- **Interfaces**: Contracts for infrastructure services

### 4. Infrastructure Layer

- **Storage Adapters**: Handle local storage and state persistence
- **External Services**: Manage external libraries like OpenCV.js
- **File System Services**: Handle file operations (loading/saving)

## Image Processing Pipeline

The image processing will be structured as a pipeline with distinct stages:

1. **Input Stage**
   - Image loading and preprocessing
   - Aspect ratio and cropping adjustments

2. **Processing Stage**
   - Posterization (color reduction)
   - Noise removal
   - Edge smoothing

3. **Output Stage**
   - Vector conversion
   - SVG generation
   - Cross-hatching transformation
   - Export handling

Each stage will be composed of one or more processors that can be chained together, enabled/disabled, or configured independently.

## Detailed Component Design

### Domain Models

#### `ImageData`
- Properties: width, height, pixels, metadata
- Methods: basic image manipulation functions

#### `PosterizeSettings`
- Properties: colorCount, thresholds, noiseSettings, smoothSettings
- Methods: validation and normalization

#### `VectorSettings`
- Properties: vectorType (filled, outline, cross-hatched), strokeWidths, etc.
- Methods: validation and configuration

### Domain Services

#### `PosterizeService`
- Responsible for color quantization algorithms
- Manages bucket assignment and threshold application

#### `NoiseRemovalService`
- Implements region detection and noise filtering algorithms

#### `SmoothingService`
- Handles edge smoothing operations

#### `VectorConversionService`
- Orchestrates various SVG conversion strategies
- Manages the selection and execution of appropriate strategy

#### SVG Conversion Strategies

##### `IVectorConversionStrategy` (Interface)
- Defines common methods for all SVG conversion strategies
- Methods: `convert(buckets, dimensions, settings): VectorOutput`
- Properties: `strategyType`, `displayName`, `description`

##### `StencilConversionStrategy`
- Implements standard filled region approach (current implementation)
- Manages contour detection and simplification
- Handles layer visibility and styling

##### `PenDrawingConversionStrategy`
- Implements pen plotter optimized drawings
- Uses unfilled paths with outline approach
- May integrate with cross-hatching for tonal representation

#### `CrossHatchingService`
- Generates cross-hatching patterns to represent tones
- Configurable density and angle patterns
- Can be used by different strategies

### Application Services

#### `ImageProcessingService`
- Orchestrates the overall image processing pipeline
- Manages the execution of domain services

#### `StateManagementService`
- Handles saving/loading application state
- Manages user preferences and previous settings

#### `ExportService`
- Handles the creation and download of SVG files
- Manages multi-layer exports and zip packaging

### Infrastructure Services

#### `LocalStorageAdapter`
- Abstracts browser local storage operations
- Handles serialization/deserialization

#### `OpenCVAdapter`
- Wraps OpenCV.js functionality
- Provides fallbacks if library fails to load

#### `FileSystemAdapter`
- Handles file reading and blob creation
- Manages download operations

### UI Layer Components

#### `UIControlManager`
- Main controller that orchestrates all UI components
- Manages UI event bindings and delegations
- Handles automatic preview updates when settings change

#### `ImageUploadComponent`
- Handles drag-and-drop and file selection
- Manages image preview display

#### `VectorPreviewComponent`
- Always visible (no toggle button needed)
- Automatically updates when settings change
- Shows SVG preview based on current strategy

#### `StrategySelectionComponent`
- Dropdown selector for vector conversion strategies
- Updates UI to show strategy-specific controls
- Triggers preview regeneration on strategy change

#### `PreviewManager`
- Handles canvas and SVG preview rendering
- Manages real-time updates of processed images

## Automatic Preview and Strategy Pattern Implementation

### Always-On SVG Preview

**Objective**: Replace the "Preview Vector" button with an always-visible SVG preview that updates automatically.

**Implementation Plan**:
- Modify the UI layout to always show the SVG preview section
- Implement a reactive pattern where changes to any settings trigger preview updates
- Add efficient update triggers to prevent unnecessary recalculations
- Use a debounce mechanism for rapid changes to avoid performance issues

### SVG Conversion Strategy Pattern

**Objective**: Implement a strategy pattern for different SVG conversion methods with contextual UI controls.

**Implementation Plan**:
1. **Core Strategy Interface**
   - Create `IVectorConversionStrategy` interface
   - Define common methods and properties for all strategies
   - Implement a strategy registry for easy lookup and instantiation

2. **Specific Strategies**
   - **Stencil Strategy** (current implementation)
     - Filled regions with optional borders
     - Layer visibility controls
     - Color customization
   
   - **Pen Drawing Strategy**
     - Outline-based drawing suitable for pen plotters
     - Cross-hatching for tonal representation
     - Pen-specific optimization settings

3. **Contextual UI**
   - Implement a strategy selector in the UI (dropdown)
   - Create dedicated UI panels for each strategy's controls
   - Show/hide controls contextually based on selected strategy
   - Persist strategy selection and settings in app state

4. **Integration**
   - Update the VectorControlManager to delegate to appropriate strategy
   - Modify ImageProcessingService to support strategy-based processing
   - Ensure proper typing and runtime type safety

## Event Flow

1. User interaction triggers UI event
2. Event handler creates a command/query
3. Application service processes the command/query
4. Domain services perform the core logic
5. Results are mapped to view models
6. UI is updated based on the new view model state

## Implementation Approach

### Phase 0: TypeScript Migration
- Set up TypeScript configuration
- Define core interfaces and types
- Create type definitions for external libraries if needed

### Phase 1: Refactoring Core Domain Logic
- Extract domain models and services with proper types
- Implement the pipeline architecture with typed interfaces
- Maintain existing functionality with improved type safety

### Phase 2: Improving UI Interaction
- Refactor UI code to use the new architecture
- Implement strongly-typed view models
- Update event handlers with typed event parameters

### Phase 3: Adding New Features
- Implement cross-hatching service with typed parameters
- Add new UI controls for cross-hatching options
- Integrate into the existing pipeline

## Code Organization

```
src/posterize/
├── index.html
├── posterize.ts (entry point)
├── types/
│   ├── interfaces.ts (common type definitions)
│   └── external.d.ts (type definitions for external libraries)
├── domain/
│   ├── models/
│   │   ├── image-data.ts
│   │   ├── posterize-settings.ts
│   │   └── vector-settings.ts
│   ├── services/
│   │   ├── posterize-service.ts
│   │   ├── noise-removal-service.ts
│   │   ├── smoothing-service.ts
│   │   ├── vector-conversion-service.ts
│   │   └── cross-hatching-service.ts
├── application/
│   ├── services/
│   │   ├── image-processing-service.ts
│   │   ├── state-management-service.ts
│   │   └── export-service.ts
│   ├── dtos/
│   │   ├── image-processing-request.ts
│   │   └── image-processing-result.ts
├── infrastructure/
│   ├── adapters/
│   │   ├── local-storage-adapter.ts
│   │   ├── opencv-adapter.ts
│   │   └── file-system-adapter.ts
├── ui/
│   ├── components/
│   │   ├── ui-control-manager.ts
│   │   ├── layer-panel-manager.ts
│   │   └── preview-manager.ts
│   ├── view-models/
│   │   ├── image-view-model.ts
│   │   └── controls-view-model.ts
```

## Benefits of This Architecture

1. **Separation of Concerns**: Clear boundaries between presentation, business logic, and infrastructure
2. **Testability**: Domain logic can be tested independently of UI
3. **Extensibility**: New features like cross-hatching can be added without modifying existing code
4. **Maintainability**: Easier to understand and modify isolated components
5. **Pipeline Flexibility**: Processing stages can be reconfigured dynamically
6. **Type Safety**: TypeScript provides compile-time type checking to catch errors early
7. **Code Intelligence**: Better IDE support with autocompletion and refactoring tools
8. **Self-Documenting Code**: Types serve as living documentation for interfaces and data structures