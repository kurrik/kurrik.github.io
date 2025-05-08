<script lang="ts">
  /// <reference path="../types.d.ts" />
  /**
   * SmoothingControl Component
   * 
   * Provides UI for controlling curve smoothing in the posterize app.
   * Replaces the SmoothingControlManager while maintaining DDD principles.
   */
  import { onMount, getContext } from 'svelte';
  import { posterizeState, posterizeSettings, smoothSettings } from '../stores/posterizeState';
  import { StateManagementService } from '../../../application/services/state-management-service';
  
  // Get services from context (injected by parent)
  interface Services {
    stateService: StateManagementService;
  }
  const services = getContext<Services>('services');
  const { stateService } = services;
  
  // Local state
  let enabled = false;
  let strength = 1;
  
  // Update smoothing enabled state
  function updateSmoothingEnabled(value: boolean) {
    enabled = value;
    
    // Get current settings
    const currentSettings = { ...stateService.getDefaultState().posterizeSettings };
    
    // Create updated settings
    const updatedSettings = {
      ...currentSettings,
      smoothSettings: {
        ...currentSettings.smoothSettings,
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
  
  // Update smoothing strength
  function updateSmoothingStrength(value: number) {
    strength = value;
    
    // Get current settings
    const currentSettings = { ...stateService.getDefaultState().posterizeSettings };
    
    // Create updated settings
    const updatedSettings = {
      ...currentSettings,
      smoothSettings: {
        ...currentSettings.smoothSettings,
        strength: value
      }
    };
    
    // Update state using the store API instead of direct assignment
    posterizeState.updatePartialState({
      posterizeSettings: updatedSettings
    });
    
    // Only trigger reprocessing if smoothing is enabled
    if (enabled) {
      const processImageEvent = new CustomEvent('posterize:processImage');
      document.dispatchEvent(processImageEvent);
    }
  }
  
  // Reactive updates
  $: {
    // When smooth settings change, update local state
    enabled = $smoothSettings.enabled;
    strength = $smoothSettings.strength;
  }
</script>

<div class="smoothing-controls">
  <!-- Section header -->
  <div class="section-header">
    <h3>Curve Smoothing</h3>
  </div>
  
  <!-- Smoothing control -->
  <div class="control-group">
    <label for="smoothingEnabled">Smoothing Strength</label>
    <div class="slider-container">
      <input 
        type="checkbox" 
        id="smoothingEnabled" 
        checked={enabled}
        on:change={(e) => updateSmoothingEnabled(e.currentTarget.checked)}
      />
      <input 
        type="range" 
        id="smoothingStrength" 
        min="1" 
        max="10" 
        step="1" 
        value={strength}
        disabled={!enabled}
        on:input={(e) => updateSmoothingStrength(parseInt(e.currentTarget.value, 10))}
      />
      <span class="value-display">{strength}</span>
    </div>
  </div>
</div>

<style>
  .smoothing-controls {
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
