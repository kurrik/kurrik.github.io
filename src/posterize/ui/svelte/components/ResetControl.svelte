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

  // Function to completely reset the application
  function resetAllSettings() {
    if (confirm('Are you sure you want to reset all settings, clear the current image, and clear all saved settings? This cannot be undone.')) {
      // Force a full page reload with a special URL parameter to indicate reset
      window.location.href = window.location.pathname + '?reset=' + Date.now();
    }
  }
  
  // Initialize the reset handler on mount
  onMount(() => {
    // Check if we're loading after a reset
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('reset')) {
      console.log('Detected reset parameter, clearing storage...');
      
      // Clear localStorage completely for the app
      const STORAGE_KEY = 'posterizeAppState';
      localStorage.removeItem(STORAGE_KEY);
      
      // Set a reset lock to prevent auto-saving for 5 seconds
      localStorage.setItem('posterizeResetLock', Date.now().toString());
      
      // Remove the reset parameter from the URL without a page reload
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      // Clear any canvas elements
      const canvasElements = document.querySelectorAll('canvas');
      canvasElements.forEach(canvas => {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      });
      
      // Show the dropzone
      const dropzone = document.querySelector('.dropzone');
      if (dropzone) {
        dropzone.classList.remove('hidden');
      }
      
      // Hide vector previews
      const vectorPreview = document.querySelector('.vector-preview');
      if (vectorPreview && vectorPreview instanceof HTMLElement) {
        vectorPreview.innerHTML = '';
      }
      
      // Notify the app that state has been reset
      const stateResetEvent = new CustomEvent('posterize:stateReset', {
        detail: { clearedImage: true, clearedStorage: true }
      });
      document.dispatchEvent(stateResetEvent);
      
      console.log('Reset complete - all settings reset, image cleared, and localStorage cleared');
    }
  });
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
