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
  // First try to load saved state, fall back to default state if none exists
  const savedState = stateService.loadState();
  const initialState = savedState || stateService.getDefaultState();
  
  // Initialize the store with the loaded or default state
  const { subscribe, set, update } = writable<AppState>(initialState);
  
  // Log for debugging
  console.log('PosterizeState initialized with:', savedState ? 'saved state from localStorage' : 'default state');
  
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
     * Reset application state to defaults and clear storage
     * Uses the domain service's proper reset method
     */
    resetState: () => {
      // Use the domain service's reset method which follows DDD principles
      const defaultState = stateService.resetState();
      
      // Update the store with the default state
      set(defaultState);
      
      // No need to call saveState as the resetState method already handles storage
      console.log('Application state reset through proper domain service');
      
      // Dispatch event is still needed for backward compatibility with event listeners
      const resetEvent = new CustomEvent('posterize:stateReset', {
        detail: { isExplicitReset: true }
      });
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

// Create derived store for crossHatchingSettings directly from the main state
// This is needed because crossHatchingSettings is a direct property of AppState, not part of PosterizeSettings
export const crossHatchingSettings = derived(posterizeState, $state => $state.crossHatchingSettings);
