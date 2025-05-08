<script lang="ts">
  /// <reference path="../types.d.ts" />
  /**
   * ResetControl Component
   * 
   * Provides UI for resetting all application settings to their defaults.
   * Follows DDD principles by focusing on a single responsibility.
   */
  import { onMount, getContext } from 'svelte';
  import { posterizeState } from '../stores/posterizeState';
  import { StateManagementService } from '../../../application/services/state-management-service';

  // Get services from context (injected by parent)
  interface Services {
    stateService: StateManagementService;
  }
  const services = getContext<Services>('services');
  const { stateService } = services;

  // Function to reset all settings to defaults and clear the image
  function resetAllSettings() {
    if (confirm('Are you sure you want to reset all settings and clear the current image? This cannot be undone.')) {
      // Get default state
      const defaultState = stateService.getDefaultState();
      
      // Unlike before, we don't keep the current image URL
      // defaultState.originalImageDataUrl is already undefined in the default state
      
      // Update the store with default values, including clearing the image
      posterizeState.updatePartialState(defaultState);
      
      // Clear any canvas elements that might still be showing the image
      const canvasElements = document.querySelectorAll('canvas');
      canvasElements.forEach(canvas => {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      });
      
      // Show the dropzone again (if it was hidden)
      const dropzone = document.querySelector('.dropzone');
      if (dropzone) {
        dropzone.classList.remove('hidden');
      }
      
      // Hide any vector previews
      const vectorPreview = document.querySelector('.vector-preview');
      if (vectorPreview && vectorPreview instanceof HTMLElement) {
        vectorPreview.innerHTML = '';
      }
      
      // Dispatch an event to notify that state has been reset
      const stateResetEvent = new CustomEvent('posterize:stateReset', {
        detail: { clearedImage: true }
      });
      document.dispatchEvent(stateResetEvent);
      
      console.log('All settings reset to defaults and image cleared');
    }
  }
</script>

<div class="reset-control">
  <button class="reset-button" on:click={resetAllSettings}>
    Reset All Settings
  </button>
</div>

<style>
  .reset-control {
    width: 100%;
    display: flex;
    justify-content: center;
    margin-top: 15px;
  }

  .reset-button {
    padding: 8px 16px;
    background-color: #ef4444;
    color: white;
    border: none;
    border-radius: 4px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .reset-button:hover {
    background-color: #dc2626;
  }
</style>
