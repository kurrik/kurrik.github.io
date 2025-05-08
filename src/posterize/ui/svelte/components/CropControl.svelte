<script lang="ts">
  /// <reference path="../types.d.ts" />
  /**
   * CropControl Component
   * 
   * Provides UI for controlling image dimensions and cropping in the posterize app.
   * Replaces the CropControlManager while maintaining DDD principles.
   */
  import { onMount, getContext } from 'svelte';
  import { posterizeState } from '../stores/posterizeState';
  import { StateManagementService } from '../../../application/services/state-management-service';
  import type { AspectRatioSetting } from '../../../types/interfaces';
  
  // Get services from context (injected by parent)
  interface Services {
    stateService: StateManagementService;
    loadImageFromUrl: (url: string) => void;
  }
  const services = getContext<Services>('services');
  const { stateService, loadImageFromUrl } = services;
  
  // Local state
  let aspectRatio: AspectRatioSetting = '1:1';
  let cropMode: 'crop' | 'fit' = 'crop';
  
  // Aspect ratio options
  const aspectRatioOptions = [
    { value: 'original', text: 'Original' },
    { value: '1:1', text: 'Square (1:1)' },
    { value: '4:3', text: 'Standard (4:3)' },
    { value: '16:9', text: 'Widescreen (16:9)' },
    { value: '8.5:11', text: 'Letter (8.5:11)' }
  ];
  
  // Crop mode options
  const cropModeOptions = [
    { value: 'crop', text: 'Crop to Fill' },
    { value: 'fit', text: 'Fit (Letterbox)' }
  ];
  
  // Update aspect ratio setting
  function updateAspectRatio(value: string) {
    aspectRatio = value as AspectRatioSetting;
    
    // Update the state using the store's updatePartialState method
    posterizeState.updatePartialState({
      cropSettings: {
        ...$posterizeState.cropSettings,
        aspectRatio
      }
    });
    
    // Reload image with new aspect ratio
    if ($posterizeState.originalImageDataUrl) {
      loadImageFromUrl($posterizeState.originalImageDataUrl);
    }
  }
  
  // Update crop mode setting
  function updateCropMode(value: string) {
    cropMode = value as 'crop' | 'fit';
    
    // Update the state using the store's updatePartialState method
    posterizeState.updatePartialState({
      cropSettings: {
        ...$posterizeState.cropSettings,
        mode: cropMode
      }
    });
    
    // Reload image with new crop mode
    if ($posterizeState.originalImageDataUrl) {
      loadImageFromUrl($posterizeState.originalImageDataUrl);
    }
  }
  
  // Parse aspect ratio string into a number
  function parseAspectRatio(val: AspectRatioSetting): number {
    if (val === '8.5:11') return 8.5 / 11;
    
    const [w, h] = val.split(':').map(Number);
    return w / h;
  }
  
  // Reactive updates
  $: {
    // When state changes, update local state
    if ($posterizeState && $posterizeState.cropSettings) {
      aspectRatio = $posterizeState.cropSettings.aspectRatio;
      cropMode = $posterizeState.cropSettings.mode;
    }
  }
</script>

<div class="crop-controls">
  <!-- Section header -->
  <div class="section-header">
    <h3>Image Dimensions</h3>
  </div>
  
  <!-- Aspect ratio control -->
  <div class="control-group">
    <label for="aspectRatio">Aspect Ratio</label>
    <div class="select-container">
      <select 
        id="aspectRatio" 
        value={aspectRatio}
        on:change={(e) => updateAspectRatio(e.currentTarget.value)}
      >
        {#each aspectRatioOptions as option}
          <option value={option.value}>{option.text}</option>
        {/each}
      </select>
    </div>
  </div>
  
  <!-- Crop mode control -->
  <div class="control-group">
    <label for="cropMode">Fit Mode</label>
    <div class="select-container">
      <select 
        id="cropMode" 
        value={cropMode}
        on:change={(e) => updateCropMode(e.currentTarget.value)}
      >
        {#each cropModeOptions as option}
          <option value={option.value}>{option.text}</option>
        {/each}
      </select>
    </div>
  </div>
</div>

<style>
  .crop-controls {
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
  
  .select-container {
    width: 100%;
  }
  
  select {
    width: 100%;
    padding: 6px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background-color: white;
  }
</style>
