<script lang="ts">
  /// <reference path="../types.d.ts" />
  /**
   * NoiseControl Component
   * 
   * Provides UI for controlling noise removal in the posterize app.
   * Replaces the NoiseControlManager while maintaining DDD principles.
   */
  import { onMount, getContext } from 'svelte';
  import { posterizeState, posterizeSettings, noiseSettings } from '../stores/posterizeState';
  import { StateManagementService } from '../../../application/services/state-management-service';
  
  // Get services from context (injected by parent)
  interface Services {
    stateService: StateManagementService;
  }
  const services = getContext<Services>('services');
  const { stateService } = services;
  
  // Local state
  let enabled = false;
  let minRegionSize = 10;
  
  // Update noise enabled state
  function updateNoiseEnabled(value: boolean) {
    enabled = value;
    
    // Get current settings
    const currentSettings = { ...stateService.getDefaultState().posterizeSettings };
    
    // Create updated settings
    const updatedSettings = {
      ...currentSettings,
      noiseSettings: {
        ...currentSettings.noiseSettings,
        enabled: value
      }
    };
    
    // Update state using the store API instead of direct assignment
    posterizeState.updatePartialState({
      posterizeSettings: updatedSettings
    });
    
    // Trigger image processing
    const processImageEvent = new CustomEvent('posterize:processImage');
    document.dispatchEvent(processImageEvent);
  }
  
  // Update min region size
  function updateMinRegionSize(value: number) {
    minRegionSize = value;
    
    // Get current settings
    const currentSettings = { ...stateService.getDefaultState().posterizeSettings };
    
    // Create updated settings
    const updatedSettings = {
      ...currentSettings,
      noiseSettings: {
        ...currentSettings.noiseSettings,
        minRegionSize: value
      }
    };
    
    // Update state using the store API instead of direct assignment
    posterizeState.updatePartialState({
      posterizeSettings: updatedSettings
    });
    
    // Only trigger reprocessing if noise removal is enabled
    if (enabled) {
      const processImageEvent = new CustomEvent('posterize:processImage');
      document.dispatchEvent(processImageEvent);
    }
  }
  
  // Reactive updates
  $: {
    // When noise settings change, update local state
    enabled = $noiseSettings.enabled;
    minRegionSize = $noiseSettings.minRegionSize;
  }
</script>

<div class="noise-controls">
  <!-- Section header -->
  <div class="section-header">
    <h3>Noise Removal</h3>
  </div>
  
  <!-- Noise removal control -->
  <div class="control-group">
    <label for="noiseEnabled">Min Region Size</label>
    <div class="slider-container">
      <input 
        type="checkbox" 
        id="noiseEnabled" 
        checked={enabled}
        on:change={(e) => updateNoiseEnabled(e.currentTarget.checked)}
      />
      <input 
        type="range" 
        id="minRegionSize" 
        min="10" 
        max="500" 
        step="10" 
        value={minRegionSize}
        disabled={!enabled}
        on:input={(e) => updateMinRegionSize(parseInt(e.currentTarget.value, 10))}
      />
      <span class="value-display">{minRegionSize}</span>
    </div>
  </div>
</div>

<style>
  .noise-controls {
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
    margin-bottom: 15px;
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
