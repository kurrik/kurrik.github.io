<script lang="ts">
  /// <reference path="../types.d.ts" />
  /**
   * VectorControl Component
   * 
   * Provides UI for controlling vector conversion settings in the posterize app.
   * Replaces the VectorControlManager while maintaining DDD principles.
   * Fixes the layer visibility toggle bug by always using the current vector output from the service.
   */
  import { onMount, getContext, createEventDispatcher } from 'svelte';
  import { get } from 'svelte/store';
  import { posterizeState, posterizeSettings, crossHatchingSettings } from '../stores/posterizeState';
  import { StateManagementService } from '../../../application/services/state-management-service';
  import { ImageProcessingService } from '../../../application/services/image-processing-service';
  import { VectorOutputService } from '../../../application/services/vector-output-service';
  import type { VectorOutput, CrossHatchingSettings } from '../../../types/interfaces';
  import { StrategyType, VectorType } from '../../../types/interfaces';
  import { VectorConversionService } from '../../../domain/services/vector-conversion-service';
  
  // Get services from context (injected by parent)
  interface Services {
    stateService: StateManagementService;
    imageService: ImageProcessingService;
    vectorService: VectorOutputService;
    vectorConversionService: VectorConversionService;
    getCurrentImageData: () => any;
  }
  const services = getContext<Services>('services');
  const { 
    stateService, 
    imageService, 
    vectorService, 
    vectorConversionService,
    getCurrentImageData
  } = services;
  
  // Local state
  let vectorOutput: VectorOutput | null = null;
  let selectedStrategy = StrategyType.STENCIL;
  let crossHatchingEnabled = false;
  let crossHatchingDensity = 5;
  let crossHatchingAngle = 45;
  let debounceTimer: number | null = null;
  const debounceDelay = 500; // ms
  
  // Elements
  let vectorPreviewElement: HTMLElement;
  let layerListElement: HTMLElement;
  
  // Initialize state on mount
  onMount(() => {
    // Subscribe to state changes
    const unsubscribeState = posterizeState.subscribe(state => {
      // Update local state based on posterize state
      if (state) {
        // If there's a vector output in the state, update our local copy
        const updatedOutput = vectorService.getVectorOutput();
        if (updatedOutput) {
          vectorOutput = updatedOutput;
          renderVectorPreview();
        }
      }
    });
    
    // Subscribe to settings changes
    const unsubscribeSettings = posterizeSettings.subscribe(settings => {
      if (settings) {
        // Check if we need to update the preview based on settings changes
        // Access vector settings and cross hatching settings from state
        const state = get(posterizeState);
        if (state && state.crossHatchingSettings) {
          crossHatchingEnabled = state.crossHatchingSettings.enabled;
          crossHatchingDensity = state.crossHatchingSettings.density;
          crossHatchingAngle = state.crossHatchingSettings.angle;
        }
        
        // If we have processed image data, update the vector preview automatically
        const imageData = getCurrentImageData();
        if (imageData) {
          // Debounce the preview generation to avoid too many renders
          if (debounceTimer) {
            clearTimeout(debounceTimer);
          }
          debounceTimer = setTimeout(() => {
            // Generate and update the vector preview
            updateVectorPreview();
          }, debounceDelay) as unknown as number;
        }
      }
    });
    
    // Initial setting values from store - use crossHatchingSettings store directly
    if ($crossHatchingSettings) {
      crossHatchingEnabled = $crossHatchingSettings.enabled;
      crossHatchingDensity = $crossHatchingSettings.density;
      crossHatchingAngle = $crossHatchingSettings.angle;
    }
    
    // Update vector preview
    updateVectorPreview();
    
    // Set up event listener for state updates
    document.addEventListener('posterize:processImage', handleImageProcessed);
    document.addEventListener('posterize:stateReset', () => updateVectorPreview());
    
    return () => {
      // Clean up event listeners
      document.removeEventListener('posterize:processImage', handleImageProcessed);
      document.removeEventListener('posterize:stateReset', () => updateVectorPreview());
      
      // Clear debounce timer
      if (debounceTimer) {
        window.clearTimeout(debounceTimer);
        debounceTimer = null;
      }
    };
  });
  
  // Handler for image processing events
  function handleImageProcessed() {
    // Debounce to avoid too many updates when multiple settings change
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      updateVectorPreview();
      debounceTimer = null;
    }, debounceDelay) as unknown as number;
  }
  
  // Update strategy selection
  function updateStrategy(e: Event) {
    const select = e.target as HTMLSelectElement;
    selectedStrategy = select.value as StrategyType;
    vectorConversionService.setActiveStrategy(selectedStrategy);
    
    // Update the vector preview with the new strategy
    updateVectorPreview();
  }
  
  // Update cross-hatching enabled state
  function updateCrossHatchingEnabled(value: boolean) {
    crossHatchingEnabled = value;
    
    // Update the state service
    const state = stateService.getDefaultState();
    if (state.crossHatchingSettings) {
      state.crossHatchingSettings.enabled = value;
      stateService.saveState(state);
    }
    
    debouncedUpdatePreview();
  }
  
  // Update cross-hatching density
  function updateCrossHatchingDensity(value: number) {
    crossHatchingDensity = value;
    
    // Update the state service
    const state = stateService.getDefaultState();
    if (state.crossHatchingSettings) {
      state.crossHatchingSettings.density = value;
      stateService.saveState(state);
    }
    
    updateVectorPreview();
  }
  
  // Update cross-hatching angle
  function updateCrossHatchingAngle(value: number) {
    crossHatchingAngle = value;
    
    // Update the state service
    const state = stateService.getDefaultState();
    if (state.crossHatchingSettings) {
      state.crossHatchingSettings.angle = value;
      stateService.saveState(state);
    }
    
    updateVectorPreview();
  }
  
  // Show or hide all layers
  function setAllLayersVisibility(visible: boolean) {
    vectorService.setAllLayersVisibility(visible);
    
    // Get the updated vector output from the service and re-render
    vectorOutput = vectorService.getVectorOutput();
    renderVectorPreview();
  }
  
  // Update a single layer's visibility
  function updateLayerVisibility(layerId: string, visible: boolean) {
    // Update the service
    // IMPORTANT: Update the layer in the service
    vectorService.updateLayerVisibility(layerId, visible);
    
    // IMPORTANT: Always get the latest vector output from the service after updating
    vectorOutput = vectorService.getVectorOutput();
    
    // Re-render with the updated output
    renderVectorPreview();
  }
  
  // Debounce the update preview call
  function debouncedUpdatePreview() {
    if (debounceTimer !== null) {
      window.clearTimeout(debounceTimer);
    }
    
    debounceTimer = window.setTimeout(() => {
      updateVectorPreview();
      debounceTimer = null;
    }, debounceDelay);
  }
  
  // Update the vector preview - always visible, updating automatically when settings change
  function updateVectorPreview() {
    console.log('Updating vector preview');
    
    // Get current image data
    const imageData = getCurrentImageData();
    if (!imageData) {
      console.warn('No image data available for vector preview');
      return;
    }
    
    // Get current settings from state
    const state = get(posterizeState);
    if (!state) {
      console.warn('No state available for vector preview');
      return;
    }

    console.log('Processing image for vector output...');
    
    // Process image and generate vector output automatically
    try {
      // Process the image with current posterize settings
      const processedResult = imageService.processImage(
        imageData,
        $posterizeSettings
      );
      
      // Make sure we got valid processed results
      if (!processedResult || !processedResult.processedImageData) {
        console.warn('Image processing did not return valid results');
        return;
      }
      
      console.log('Image processed successfully, generating vector...');
      
      // Set vector settings based on selected strategy
      let vectorSettings;
      if (selectedStrategy === StrategyType.PEN_DRAWING) {
        // Use unfilled paths for pen drawing strategy
        vectorSettings = {
          type: VectorType.OUTLINE,
          curveSmoothing: 1,
          exportLayers: true
        };
      } else {
        // Use filled paths for stencil strategy (default)
        vectorSettings = {
          type: VectorType.FILLED,
          curveSmoothing: 1,
          exportLayers: true
        };
      }
      
      // Generate vector from processed result using the selected strategy
      const vectorResult = imageService.generateVector(
        processedResult,
        vectorSettings
      );
      
      // Make sure we have valid vector output
      if (!vectorResult || !vectorResult.vectorOutput || !vectorResult.vectorOutput.layers || vectorResult.vectorOutput.layers.length === 0) {
        console.warn('Vector generation did not return valid results');
        return;
      }
      
      console.log('Vector generated successfully with', vectorResult.vectorOutput.layers.length, 'layers');
      
      // IMPORTANT: Store the vector output in the service
      vectorService.setVectorOutput(vectorResult.vectorOutput);
      
      // IMPORTANT: Get the vector output from the service to ensure we have the latest version
      // This fixes the layer visibility toggle bug mentioned in the memory
      vectorOutput = vectorService.getVectorOutput();
      
      // Render the preview
      renderVectorPreview();
    } catch (error) {
      console.error('Error generating vector preview:', error);
    }
  }
  
  // Render the vector preview
  function renderVectorPreview() {
    console.log('Rendering vector preview:', vectorOutput ? 'has output' : 'no output', vectorPreviewElement ? 'has element' : 'no element');
    
    if (!vectorOutput || !vectorPreviewElement) {
      console.warn('Cannot render SVG preview: missing vectorOutput or vectorPreviewElement');
      // Add debug message to the preview element if it exists
      if (vectorPreviewElement) {
        vectorPreviewElement.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No vector data available yet. Upload an image and adjust settings to see SVG preview.</div>';
      }
      return;
    }
    
    // Clear existing content
    vectorPreviewElement.innerHTML = '';
    
    // Ensure the element has proper styling
    vectorPreviewElement.style.display = 'flex';
    vectorPreviewElement.style.justifyContent = 'center';
    vectorPreviewElement.style.alignItems = 'center';
    vectorPreviewElement.style.flexDirection = 'column';
    vectorPreviewElement.style.minHeight = '200px';
    vectorPreviewElement.style.width = '100%';
    
    // Create the SVG elements for preview
    const { width, height } = vectorOutput.dimensions;
    const svgNS = 'http://www.w3.org/2000/svg';
    
    console.log('Vector dimensions:', width, 'x', height, 'Layers:', vectorOutput.layers.length);
    
    // Create container for layers
    const layersDiv = document.createElement('div');
    layersDiv.style.position = 'relative';
    layersDiv.style.width = `${width}px`;
    layersDiv.style.height = `${height}px`;
    layersDiv.style.margin = '0 auto';
    
    // Add background
    const bgDiv = document.createElement('div');
    bgDiv.style.position = 'absolute';
    bgDiv.style.width = '100%';
    bgDiv.style.height = '100%';
    bgDiv.style.background = vectorOutput.background;
    layersDiv.appendChild(bgDiv);
    
    // Add each SVG layer
    vectorOutput.layers.forEach((layer, i) => {
      if (!layer.visible) return;
      
      const svgElem = document.createElementNS(svgNS, 'svg');
      svgElem.setAttribute('width', width.toString());
      svgElem.setAttribute('height', height.toString());
      svgElem.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svgElem.style.position = 'absolute';
      svgElem.style.top = '0';
      svgElem.style.left = '0';
      svgElem.style.width = '100%';
      svgElem.style.height = '100%';
      svgElem.style.zIndex = (i + 1).toString();
      svgElem.style.opacity = '0.7';
      
      layer.paths.forEach(path => {
        const pathElem = document.createElementNS(svgNS, 'path');
        pathElem.setAttribute('d', path.d);
        pathElem.setAttribute('fill', path.fill);
        pathElem.setAttribute('stroke', path.stroke);
        pathElem.setAttribute('stroke-width', path.strokeWidth);
        svgElem.appendChild(pathElem);
      });
      
      layersDiv.appendChild(svgElem);
    });
    
    vectorPreviewElement.appendChild(layersDiv);
    
    // Update layer controls
    updateLayerControls();
  }
  
  // Update the layer controls based on the current vector output
  function updateLayerControls() {
    if (!vectorOutput || !layerListElement) return;
    
    // Clear existing controls
    layerListElement.innerHTML = '';
    
    // Create layer toggles
    vectorOutput.layers.forEach((layer, i) => {
      const layerDiv = document.createElement('div');
      layerDiv.className = 'layer-control';
      layerDiv.style.display = 'flex';
      layerDiv.style.alignItems = 'center';
      layerDiv.style.marginBottom = '8px';
      
      // Create color swatch
      const swatch = document.createElement('div');
      swatch.style.width = '20px';
      swatch.style.height = '20px';
      swatch.style.marginRight = '8px';
      
      // If paths exist, use their color for the swatch
      if (layer.paths && layer.paths.length > 0) {
        swatch.style.backgroundColor = layer.paths[0].fill;
      } else {
        swatch.style.backgroundColor = '#ccc';
      }
      
      // Create checkbox
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = layer.visible;
      checkbox.id = `layer-toggle-${i}`;
      checkbox.setAttribute('data-layer-id', layer.id);
      checkbox.style.marginRight = '8px';
      
      // IMPORTANT: Add event listener that properly updates and re-renders the layer
      checkbox.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const isVisible = target.checked;
        const layerId = target.getAttribute('data-layer-id');
        if (layerId) {
          updateLayerVisibility(layerId, isVisible);
        }
      });
      
      // Create label
      const label = document.createElement('label');
      label.htmlFor = `layer-toggle-${i}`;
      label.textContent = `Layer ${i + 1}`;
      
      // Append elements
      layerDiv.appendChild(swatch);
      layerDiv.appendChild(checkbox);
      layerDiv.appendChild(label);
      layerListElement.appendChild(layerDiv);
    });
  }
</script>

<div class="vector-controls">
  <!-- Vector preview -->
  <div class="vector-preview-container">
    <!-- Strategy selector -->
    <div class="control-group">
      <label for="strategySelector">SVG Style:</label>
      <select 
        id="strategySelector" 
        bind:value={selectedStrategy}
        on:change={() => updateVectorPreview()}
      >
        <option value={StrategyType.STENCIL}>Stencil (filled areas)</option>
        <option value={StrategyType.PEN_DRAWING}>Pen Drawing (outlines)</option>
      </select>
    </div>
    
    <!-- Strategy description -->
    <div class="strategy-description">
      {#if selectedStrategy === StrategyType.STENCIL}
        <small>Stencil mode creates filled shapes suitable for vinyl cutting or traditional stencils.</small>
      {:else if selectedStrategy === StrategyType.PEN_DRAWING}
        <small>Pen Drawing mode creates unfilled paths suitable for pen plotters and drawing machines.</small>
      {/if}
    </div>
    
    <!-- Vector preview area -->
    <div class="preview-wrapper" style="margin: 1rem 0; padding: 1rem; border: 1px solid #ddd; border-radius: 4px; background-color: #f9f9f9;">
      <h3 style="margin-top: 0;">SVG Preview</h3>
      <div bind:this={vectorPreviewElement} class="vector-preview" style="min-height: 200px; display: flex; justify-content: center; align-items: center;"></div>
    </div>
    <!-- Layer controls -->
    <div class="layer-controls-container">
      <div class="section-header">
        <h3>Layer Controls</h3>
      </div>
      
      <div class="button-container">
        <button class="show-all-btn" on:click={() => setAllLayersVisibility(true)}>
          Show All Layers
        </button>
        <button class="hide-all-btn" on:click={() => setAllLayersVisibility(false)}>
          Hide All Layers
        </button>
      </div>
      
      <div bind:this={layerListElement} class="layer-list"></div>
    </div>
  </div>
  
  <!-- Contextual controls -->
  {#if selectedStrategy === StrategyType.STENCIL}
    <!-- Stencil controls would go here -->
  {:else if selectedStrategy === StrategyType.PEN_DRAWING}
    <!-- Pen drawing controls -->
    <div class="pen-drawing-controls">
      <div class="section-header">
        <h3>Pen Plotter Settings</h3>
      </div>
      
      <!-- Cross-hatching toggle -->
      <div class="control-group">
        <label>
          <input 
            type="checkbox" 
            checked={crossHatchingEnabled}
            on:change={(e) => updateCrossHatchingEnabled(e.currentTarget.checked)}
          />
          Use Cross-Hatching for Tones
        </label>
      </div>
      
      <!-- Cross-hatching density -->
      <div class="control-group">
        <label for="crossHatchingDensity">Density:</label>
        <div class="slider-container">
          <input 
            type="range" 
            id="crossHatchingDensity" 
            min="1" 
            max="10" 
            step="1" 
            value={crossHatchingDensity}
            disabled={!crossHatchingEnabled}
            on:input={(e) => updateCrossHatchingDensity(parseInt(e.currentTarget.value, 10))}
          />
          <span class="value-display">{crossHatchingDensity}</span>
        </div>
      </div>
      
      <!-- Cross-hatching angle -->
      <div class="control-group">
        <label for="crossHatchingAngle">Angle:</label>
        <div class="slider-container">
          <input 
            type="range" 
            id="crossHatchingAngle" 
            min="0" 
            max="180" 
            step="1" 
            value={crossHatchingAngle}
            disabled={!crossHatchingEnabled}
            on:input={(e) => updateCrossHatchingAngle(parseInt(e.currentTarget.value, 10))}
          />
          <span class="value-display">{crossHatchingAngle}°</span>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .vector-controls {
    width: 100%;
  }
  
  .vector-preview-container {
    display: flex;
    flex-direction: column;
    width: 100%;
  }
  
  .section-header {
    margin-bottom: 12px;
    font-weight: bold;
    color: #059669;
  }
  
  .control-group {
    display: grid;
    grid-template-columns: 80px 1fr;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .slider-container {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .preview-wrapper {
    margin: 15px 0;
    display: flex;
    justify-content: center;
  }
  
  .vector-preview {
    max-width: 100%;
    overflow: auto;
    border: 1px solid #ddd;
    padding: 10px;
  }
  
  .layer-controls-container {
    margin-top: 15px;
  }
  
  .button-container {
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
  }
  
  button {
    padding: 6px 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }
  
  .show-all-btn {
    background-color: #3b82f6;
    color: white;
  }
  
  .hide-all-btn {
    background-color: #10b981;
    color: white;
  }
  
  .value-display {
    min-width: 24px;
    text-align: right;
  }
  
  .pen-drawing-controls {
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid #eee;
  }
  
  .layer-list {
    max-height: 200px;
    overflow-y: auto;
    margin-top: 10px;
  }
</style>
