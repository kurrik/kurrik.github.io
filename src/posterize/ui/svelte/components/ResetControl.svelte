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

  /**
   * Reset application to defaults and clear the image
   * Uses the proper domain service method instead of direct DOM manipulation
   */
  function resetAllSettings() {
    if (confirm('Are you sure you want to reset all settings, clear the current image, and clear all saved settings? This cannot be undone.')) {
      console.log('Resetting application to default state...');
      
      // Use the store's resetState method which calls the domain service
      // This follows our DDD principles and keeps reset logic in the domain layer
      posterizeState.resetState();
      
      // The domain service will dispatch events that other components can listen to
      // We don't need to manually clear DOM elements or localStorage anymore
      
      console.log('Reset complete - all settings reset and state cleared');
    }
  }
  
  // Listen for reset events to clear any local state in this component
  onMount(() => {
    const handleReset = (event: Event) => {
      // Handle any component-specific reset actions here if needed
      console.log('ResetControl received reset event');
    };
    
    document.addEventListener('posterize:stateReset', handleReset);
    
    return () => {
      document.removeEventListener('posterize:stateReset', handleReset);
    };
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
