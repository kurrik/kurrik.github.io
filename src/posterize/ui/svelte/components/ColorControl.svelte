<script lang="ts">
  /// <reference path="../types.d.ts" />
  /**
   * ColorControl Component
   * 
   * Provides UI for adjusting color thresholds in the posterize app.
   * Replaces the ColorControlManager while maintaining DDD principles.
   */
  import { onMount, getContext } from 'svelte';
  import { posterizeSettings, colorSettings } from '../stores/posterizeState';
  import { StateManagementService } from '../../../application/services/state-management-service';
  import { ImageProcessingService } from '../../../application/services/image-processing-service';
  import { VectorOutputService } from '../../../application/services/vector-output-service';
  
  // Local state
  let colorCount = 2;
  let thresholds: number[] = [];
  let thresholdElements: {[key: string]: HTMLElement | null} = {};
  
  // Get services from context (injected by parent)
  interface Services {
    stateService: StateManagementService;
    imageService: ImageProcessingService;
    vectorService: VectorOutputService;
  }
  const services = getContext<Services>('services');
  const { stateService } = services;
  
  // Function to create/update threshold controls reactively
  function createThresholdControls(container: HTMLElement | null) {
    if (!container) return;
    
    // Clear existing controls
    container.innerHTML = '';
    
    // Create container for threshold sliders
    const thresholdControls = document.createElement('div');
    thresholdControls.id = 'thresholdControls';
    container.appendChild(thresholdControls);
    
    // Create sliders for each threshold
    for (let i = 0; i < colorCount - 1; i++) {
      const threshold = thresholds[i] || Math.round(255 * (i + 1) / colorCount);
      
      // Create threshold control group
      const group = document.createElement('div');
      group.className = 'control-group';
      
      // Create label
      const label = document.createElement('label');
      label.textContent = `Threshold ${i + 1}`;
      group.appendChild(label);
      
      // Create slider container
      const sliderContainer = document.createElement('div');
      sliderContainer.className = 'slider-container';
      
      // Create slider
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '1';
      slider.max = '254';
      slider.value = threshold.toString();
      slider.className = 'threshold-slider';
      slider.dataset.index = i.toString();
      
      // Create value display
      const valueDisplay = document.createElement('span');
      valueDisplay.className = 'value-display';
      valueDisplay.textContent = threshold.toString();
      
      // Add elements to container
      sliderContainer.appendChild(slider);
      sliderContainer.appendChild(valueDisplay);
      group.appendChild(sliderContainer);
      
      // Add to threshold controls
      thresholdControls.appendChild(group);
      
      // Store references
      thresholdElements[`slider-${i}`] = slider;
      thresholdElements[`label-${i}`] = valueDisplay;
      
      // Add event listener
      slider.addEventListener('input', () => {
        const value = parseInt(slider.value, 10);
        valueDisplay.textContent = value.toString();
        
        // Update threshold in state
        updateThreshold(i, value);
      });
    }
  }
  
  // Helper to update a specific threshold
  function updateThreshold(index: number, value: number) {
    // Update the threshold
    const newThresholds = [...thresholds];
    newThresholds[index] = value;
    
    // Update the store
    $posterizeSettings = {
      ...$posterizeSettings,
      thresholds: newThresholds
    };
    
    // Save state via service (maintains domain integrity)
    let state = stateService.getDefaultState();
    state.posterizeSettings = $posterizeSettings;
    stateService.saveState(state);
    
    // Trigger image processing
    const processImageEvent = new CustomEvent('posterize:processImage');
    document.dispatchEvent(processImageEvent);
    
    // Trigger vector preview update
    const vectorPreviewEvent = new CustomEvent('posterize:generateVectorPreview');
    document.dispatchEvent(vectorPreviewEvent);
  }
  
  // Handle color count changes
  function updateColorCount(value: number) {
    // Update local state
    colorCount = value;
    
    // Update the application state
    $posterizeSettings = {
      ...$posterizeSettings,
      colorCount: value,
      thresholds: Array.from(
        { length: value - 1 },
        (_, i) => Math.round(255 * (i + 1) / value)
      )
    };
    
    // Save state via service
    let state = stateService.getDefaultState();
    state.posterizeSettings = $posterizeSettings;
    stateService.saveState(state);
    
    // Re-render threshold controls
    const container = document.getElementById('thresholdControlsContainer');
    createThresholdControls(container);
    
    // Trigger image processing
    const processImageEvent = new CustomEvent('posterize:processImage');
    document.dispatchEvent(processImageEvent);
    
    // Trigger vector preview update
    const vectorPreviewEvent = new CustomEvent('posterize:generateVectorPreview');
    document.dispatchEvent(vectorPreviewEvent);
  }
  
  // Reactive updates
  $: {
    // When posterize settings change, update local state
    colorCount = $posterizeSettings.colorCount;
    thresholds = $posterizeSettings.thresholds;
  }
  
  // Component initialization
  onMount(() => {
    // Create threshold controls
    const container = document.getElementById('thresholdControlsContainer');
    createThresholdControls(container);
    
    return () => {
      // Cleanup
      Object.values(thresholdElements).forEach(element => {
        if (element && element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
    };
  });
</script>

<div class="color-controls">
  <!-- Color count control -->
  <div class="section-header">
    <h3>Color Thresholds</h3>
  </div>
  
  <div class="control-group threshold-slider" style="margin-bottom: 12px">
    <label for="colorCount">Color Count</label>
    <div class="slider-container">
      <input 
        type="range" 
        id="colorCount" 
        min="2" 
        max="8" 
        step="1" 
        value={colorCount}
        on:input={(e) => updateColorCount(parseInt(e.currentTarget.value, 10))}
      />
      <span class="value-display">{colorCount}</span>
    </div>
  </div>
  
  <!-- Threshold controls will be rendered by JS in the thresholdControlsContainer -->
  <!-- This demonstrates a hybrid approach during migration -->
</div>

<style>
  .color-controls {
    width: 100%;
  }
  
  .section-header {
    margin-bottom: 12px;
    font-weight: bold;
    color: #059669;
  }
  
  .control-group {
    display: grid;
    grid-template-columns: 120px 1fr;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .slider-container {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  input[type="range"] {
    flex: 1;
  }
  
  .value-display {
    min-width: 24px;
    text-align: right;
  }
</style>
