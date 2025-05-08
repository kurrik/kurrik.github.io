/**
 * Posterize Application - Svelte Entry Point
 *
 * This file serves as the Svelte entry point for the Posterize application.
 * It initializes all the required services and mounts the App component.
 */

import App from './components/App.svelte';
import { ImageProcessingService } from '../../application/services/image-processing-service';
import { StateManagementService } from '../../application/services/state-management-service';
import { VectorOutputService } from '../../application/services/vector-output-service';
import { VectorConversionService } from '../../domain/services/vector-conversion-service';
import { LocalStorageAdapter } from '../../infrastructure/adapters/local-storage-adapter';
import type { SvelteComponent } from 'svelte';
import { mount } from 'svelte';

// Initialize services
const localStorageAdapter = new LocalStorageAdapter();
const stateManagementService = new StateManagementService(localStorageAdapter);
const imageProcessingService = new ImageProcessingService();
const vectorConversionService = new VectorConversionService();
const vectorOutputService = new VectorOutputService();

// Function to initialize and mount Svelte app
function mountSvelteApp() {
  console.log('Attempting to mount Svelte app...');
  
  // Find or create mount point
  let mountElement = document.getElementById('posterize-svelte-app');
  if (!mountElement) {
    console.log('Mount point not found, creating one...');
    mountElement = document.createElement('div');
    mountElement.id = 'posterize-svelte-app';
    document.body.appendChild(mountElement);
  } else {
    console.log('Found existing mount point...');
  }

  // Make services available globally for debugging and cross-component access if needed
  (window as any).__posterizeServices = {
    stateManagementService,
    imageProcessingService,
    vectorOutputService,
    vectorConversionService
  };

  try {
    // In Svelte 5, the proper way to mount a component is to use the mount function
    // This avoids the "component_api_invalid_new" error
    
    // Create a custom element for the mounting if needed
    const appElement = document.createElement('div');
    mountElement.appendChild(appElement);
    
    // Use the mount function from Svelte 5
    // Add type assertion to work around TypeScript type issues with Svelte 5
    const root = mount(App as any, {
      target: appElement,
      props: {
        stateManagementService,
        imageProcessingService,
        vectorOutputService,
        vectorConversionService
      }
    });

    // Make available globally for debugging if needed
    (window as any).__posterizeSvelteApp = root;
    
    console.log('Posterize Svelte application successfully initialized');
    return root;
  } catch (error) {
    console.error('Error initializing Svelte app:', error);
    return null;
  }
}

// Initialize the app when the DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountSvelteApp);
} else {
  // DOM already loaded, mount immediately
  mountSvelteApp();
}

export default App;
