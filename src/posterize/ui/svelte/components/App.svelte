<script lang="ts">
  /// <reference path="../types.d.ts" />
  /**
   * Main Posterize App Component
   * 
   * This serves as the entry point for the Svelte UI layer,
   * orchestrating the domain services and child components.
   */
  // @ts-ignore - Will be available when Svelte is installed
  import { onMount, setContext } from 'svelte';
  import { createPosterizeStore } from '../stores/posterizeState';
  
  // Import domain services - these remain unchanged as per DDD principles
  import { ImageProcessingService } from '../../../application/services/image-processing-service';
  import { StateManagementService } from '../../../application/services/state-management-service';
  import { VectorOutputService } from '../../../application/services/vector-output-service';
  
  // These services are passed in from the entry point
  export let stateManagementService: StateManagementService;
  export let imageProcessingService: ImageProcessingService;
  export let vectorOutputService: VectorOutputService;
  
  // Create the app state store using the injected service
  const posterizeStore = createPosterizeStore(stateManagementService);
  
  // Make services and stores available to child components via context
  setContext('posterizeStore', posterizeStore);
  setContext('services', {
    stateService: stateManagementService,
    imageService: imageProcessingService,
    vectorService: vectorOutputService
  });
  
  // Local state
  let appInitialized = false;
  
  // When component mounts, initialize services and setup
  onMount(() => {
    // Subscribe to state changes
    const unsubscribe = posterizeStore.subscribe(state => {
      // This will run whenever the state changes
      // For now, we're just logging this for debugging
      console.log('State updated:', state);
    });
    
    // Handle initialization that managers previously did
    appInitialized = true;
    
    return () => {
      // Cleanup when component is destroyed
      unsubscribe();
    };
  });
</script>

<!-- 
  This will be our main app template. For now, it's empty as we'll 
  incrementally migrate each component from the existing codebase.
  
  The initial implementation will simply render the existing UI
  while we work on the Svelte migration behind the scenes.
-->
<div class="posterize-app">
  {#if appInitialized}
    <!-- As we migrate components, they'll be added here -->
    <slot></slot>
  {:else}
    <div>Initializing Posterize...</div>
  {/if}
</div>
