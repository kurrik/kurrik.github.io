<script lang="ts">
  /// <reference path="../types.d.ts" />
  /**
   * BorderControl Component
   * 
   * Provides UI for controlling border settings in the posterize app.
   * Replaces the BorderControlManager while maintaining DDD principles.
   */
  import { onMount, getContext } from 'svelte';
  import { get } from 'svelte/store';
  import { posterizeState, posterizeSettings, borderSettings } from '../stores/posterizeState';
  import { StateManagementService } from '../../../application/services/state-management-service';
  
  // Get services from context (injected by parent)
  interface Services {
    stateService: StateManagementService;
  }
  const services = getContext<Services>('services');
  const { stateService } = services;
  
  // Local state
  let enabled = false;
  let thickness = 1;
  
  // Update border enabled state
  function updateBorderEnabled(value: boolean) {
    enabled = value;
    
    // Get current settings from the store, not default values
    const currentSettings = get(posterizeSettings);
    
    // Create updated settings while preserving all other settings
    const updatedSettings = {
      ...currentSettings,
      borderSettings: {
        ...currentSettings.borderSettings,
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
  
  // Update border thickness
  function updateBorderThickness(value: number) {
    thickness = value;
    
    // Get current settings from the store, not default values
    const currentSettings = get(posterizeSettings);
    
    // Create updated settings while preserving all other settings
    const updatedSettings = {
      ...currentSettings,
      borderSettings: {
        ...currentSettings.borderSettings,
        thickness: value
      }
    };
    
    // Update state using the store API instead of direct assignment
    posterizeState.updatePartialState({
      posterizeSettings: updatedSettings
    });
    
    // Always trigger reprocessing when thickness changes
    const processImageEvent = new CustomEvent('posterize:processImage');
    document.dispatchEvent(processImageEvent);
  }
  
  // Reactive updates
  $: {
    // When border settings change, update local state
    enabled = $borderSettings.enabled;
    thickness = $borderSettings.thickness;
  }
</script>

<div class="border-controls">
  <!-- Section header -->
  <div class="section-header">
    <h3>Border Settings</h3>
  </div>
  
  <!-- Border control -->
  <div class="control-group">
    <label for="borderEnabled">Border Thickness</label>
    <div class="slider-container">
      <input 
        type="checkbox" 
        id="borderEnabled" 
        checked={enabled}
        on:change={(e) => updateBorderEnabled(e.currentTarget.checked)}
      />
      <input 
        type="range" 
        id="borderThickness" 
        min="1" 
        max="10" 
        step="1" 
        value={thickness}
        disabled={!enabled}
        on:input={(e) => updateBorderThickness(parseInt(e.currentTarget.value, 10))}
      />
      <span class="value-display">{thickness}</span>
    </div>
  </div>
</div>

<style>
  .border-controls {
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
