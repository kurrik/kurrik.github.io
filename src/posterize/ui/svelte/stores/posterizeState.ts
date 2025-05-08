/**
 * Posterize State Store
 * 
 * This store maintains the application state for the Posterize app
 * following Domain-Driven Design principles:
 * - Maintains a clear boundary between UI and domain
 * - Preserves the same interface as the original StateManagementService
 * - Provides reactive state updates for Svelte components
 */

/// <reference path="../types.d.ts" />

// @ts-ignore - Will be available when Svelte is installed
import { writable, derived, get } from 'svelte/store';
import type { AppState } from '../../../types/interfaces';
import { StateManagementService } from '../../../application/services/state-management-service';
import { LocalStorageAdapter } from '../../../infrastructure/adapters/local-storage-adapter';

/**
 * Creates a store for managing posterize application state
 * This replaces the BaseManager functionality while preserving DDD boundaries
 */
export function createPosterizeStore(stateService: StateManagementService) {
  // Initialize with default state from the domain service
  const { subscribe, set, update } = writable<AppState>(stateService.getDefaultState());
  
  return {
    subscribe,
    
    /**
     * Update the application state and persist via state service
     */
    updateState: (state: AppState) => {
      set(state);
      stateService.saveState(state);
      
      // Dispatch custom event for backwards compatibility with existing code
      const event = new CustomEvent('posterize:stateUpdated', { detail: state });
      document.dispatchEvent(event);
    },
    
    /**
     * Update a portion of the state
     */
    updatePartialState: (partialState: Partial<AppState>) => {
      update(state => {
        const newState = { ...state, ...partialState };
        stateService.saveState(newState);
        
        // Dispatch custom event for backwards compatibility
        const event = new CustomEvent('posterize:stateUpdated', { detail: newState });
        document.dispatchEvent(event);
        
        return newState;
      });
    },
    
    /**
     * Get the current state value
     */
    getState: () => get(posterizeState),
    
    /**
     * Reset to default state
     */
    resetState: () => {
      const defaultState = stateService.getDefaultState();
      set(defaultState);
      stateService.saveState(defaultState);
      
      // Dispatch custom event for backwards compatibility
      const event = new CustomEvent('posterize:stateUpdated', { detail: defaultState });
      document.dispatchEvent(event);
      
      // Dispatch reset event for components that need to perform special actions
      const resetEvent = new CustomEvent('posterize:stateReset');
      document.dispatchEvent(resetEvent);
    }
  };
}

// Create and export the singleton store instance
export const posterizeState = createPosterizeStore(new StateManagementService(new LocalStorageAdapter()));

// Create derived stores for specific aspects of the state
// These make it easier for components to subscribe only to what they need
export const posterizeSettings = derived(posterizeState, $state => $state.posterizeSettings);
export const colorSettings = derived(posterizeSettings, $settings => ({
  colorCount: $settings.colorCount,
  thresholds: $settings.thresholds
}));
// Create other derived stores for specific settings
export const noiseSettings = derived(posterizeSettings, $settings => $settings.noiseSettings);
export const smoothSettings = derived(posterizeSettings, $settings => $settings.smoothSettings);
export const borderSettings = derived(posterizeSettings, $settings => $settings.borderSettings);
