<script lang="ts">
  /// <reference path="../types.d.ts" />
  /**
   * ColorControl Component
   * 
   * Provides UI for adjusting color thresholds in the posterize app.
   * Replaces the ColorControlManager while maintaining DDD principles.
   */
  import { onMount, getContext } from 'svelte';
  import { get } from 'svelte/store';
  import { posterizeState, posterizeSettings } from '../stores/posterizeState';
  import { StateManagementService } from '../../../application/services/state-management-service';
  import { ImageProcessingService } from '../../../application/services/image-processing-service';
  
  // Get services from context (injected by parent)
  interface Services {
    stateService: StateManagementService;
    imageService: ImageProcessingService;
  }
  const services = getContext<Services>('services');
  const { stateService, imageService } = services;
  
  // Reactive data from store
  $: colorCount = $posterizeSettings?.colorCount || 2;
  $: thresholds = $posterizeSettings?.thresholds || [];
  
  // Monitor store values to ensure local state stays updated
  $: {
    if ($posterizeSettings) {
      // Ensure our local variables track the store values
      colorCount = $posterizeSettings.colorCount || 2;
      thresholds = $posterizeSettings.thresholds || [];
    }
  }
  
  // Using onMount to ensure any initial inconsistencies are fixed
  onMount(() => {
    // If the thresholds don't match the color count at startup, fix them
    if (colorCount > 1 && thresholds.length !== colorCount - 1) {
      const newThresholds = generateEvenThresholds(colorCount);
      updateThresholds(newThresholds);
      console.log('Fixed initial threshold count on mount:', newThresholds);
    }
  });
  
  // Function to generate evenly distributed thresholds
  function generateEvenThresholds(count: number): number[] {
    const newThresholds: number[] = [];
    for (let i = 0; i < count - 1; i++) {
      newThresholds.push(Math.round(255 * (i + 1) / count));
    }
    return newThresholds;
  }
  
  // Update color count and immediately generate appropriate thresholds
  function handleColorCountChange(event: Event) {
    const value = parseInt((event.target as HTMLInputElement).value);
    if (value >= 2 && value <= 8) {
      // Generate new thresholds array for this color count
      const newThresholds = generateEvenThresholds(value);
      
      // Update both color count and thresholds in a single operation
      updateSettings({
        ...get(posterizeSettings),
        colorCount: value,
        thresholds: newThresholds
      });
      
      console.log(`Updated color count to ${value} with ${newThresholds.length} thresholds:`, newThresholds);
    }
  }
  
  // Update a single threshold
  function handleThresholdChange(index: number, event: Event) {
    const value = parseInt((event.target as HTMLInputElement).value);
    const newThresholds = [...thresholds];
    newThresholds[index] = value;
    updateThresholds(newThresholds);
  }
  
  // Update the thresholds in state
  function updateThresholds(newThresholds: number[]) {
    updateSettings({
      ...get(posterizeSettings),
      thresholds: newThresholds
    });
  }
  
  // Update posterize settings
  function updateSettings(newSettings: any) {
    // Update state via state management service
    posterizeState.updatePartialState({
      posterizeSettings: newSettings
    });
    
    // Dispatch event to trigger image processing
    const event = new CustomEvent('posterize:processImage', {
      detail: { settings: newSettings }
    });
    document.dispatchEvent(event);
  }
  
  // Component initialization
  onMount(() => {
    // Log initial state for debugging
    console.log('ColorControl mounted with', colorCount, 'colors and', thresholds.length, 'thresholds');
  });
</script>

<div class="color-controls">
  <!-- Color count control -->
  <div class="section-header">
    <h3>Color Count</h3>
  </div>
  
  <div class="control-group">
    <label for="colorCountInput">Number of Colors:</label>
    <div class="slider-container">
      <input 
        type="range" 
        id="colorCountInput" 
        min="2" 
        max="8" 
        step="1" 
        value={colorCount}
        on:input={e => handleColorCountChange(e)}
      />
      <span class="value-display">{colorCount}</span>
    </div>
  </div>
  
  <!-- Individual threshold sliders -->
  <div class="section-header">
    <h3>Color Thresholds</h3>
    <small>Adjust individual thresholds for precise color separation</small>
  </div>
  
  <!-- Svelte's reactive approach - generate sliders based on threshold count -->
  <div class="threshold-controls">
    {#if thresholds && thresholds.length > 0}
      {#each thresholds as threshold, i}
        <div class="control-group threshold-control">
          <label for="threshold{i}">Threshold {i+1}:</label>
          <div class="slider-container">
            <input 
              type="range" 
              id="threshold{i}" 
              min="1" 
              max="254" 
              step="1" 
              value={threshold}
              on:input={e => handleThresholdChange(i, e)}
            />
            <span class="value-display">{threshold}</span>
          </div>
        </div>
      {/each}
    {:else}
      <p class="no-thresholds">Adjust the color count to create thresholds</p>
    {/if}
  </div>
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
