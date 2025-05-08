<script lang="ts">
  /// <reference path="../types.d.ts" />
  // @ts-ignore - Temporarily disable TypeScript checks for Svelte component typing
  // This is a pragmatic solution during the migration process
  /**
   * Main Posterize App Component
   *
   * This serves as the entry point for the Svelte UI layer,
   * orchestrating the domain services and child components.
   */
  import { onMount, setContext } from "svelte";
  import { posterizeState } from "../stores/posterizeState";

  // Import domain services - these remain unchanged as per DDD principles
  import { ImageProcessingService } from "../../../application/services/image-processing-service";
  import { StateManagementService } from "../../../application/services/state-management-service";
  import { VectorOutputService } from "../../../application/services/vector-output-service";
  import { VectorConversionService } from "../../../domain/services/vector-conversion-service";

  // Import Svelte components with proper type annotations
  import ImageLoader from "./ImageLoader.svelte";
  import ColorControl from "./ColorControl.svelte";
  import NoiseControl from "./NoiseControl.svelte";
  import SmoothingControl from "./SmoothingControl.svelte";
  import BorderControl from "./BorderControl.svelte";
  import CropControl from "./CropControl.svelte";
  import VectorControl from "./VectorControl.svelte";
  import ExportControl from "./ExportControl.svelte";

  // Component references - Use 'any' type to fix TypeScript errors during migration
  let imageLoaderComponent: any;

  // Create default service instances
  import { LocalStorageAdapter } from "../../../infrastructure/adapters/local-storage-adapter";
  const defaultLocalStorageAdapter = new LocalStorageAdapter();
  const defaultStateService = new StateManagementService(defaultLocalStorageAdapter);
  const defaultImageService = new ImageProcessingService();
  const defaultVectorService = new VectorOutputService();
  const defaultConversionService = new VectorConversionService();

  // These services can be passed in as props or use defaults
  export let stateManagementService: StateManagementService = defaultStateService;
  export let imageProcessingService: ImageProcessingService = defaultImageService;
  export let vectorOutputService: VectorOutputService = defaultVectorService;
  export let vectorConversionService: VectorConversionService = defaultConversionService;

  // State to track initialization
  let appInitialized = false;

  // Integrates Svelte components with existing HTML elements like canvas and dropzone
  function setupLegacyElementIntegration() {
    const dropzone = document.getElementById("dropzone");
    const fileInput = document.getElementById("fileInput") as HTMLInputElement;
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;

    if (dropzone && fileInput && canvas) {
      // Setup dropzone events to work with our ImageLoader component
      dropzone.addEventListener("click", () => {
        fileInput.click();
      });

      fileInput.addEventListener("change", (event) => {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
          const file = input.files[0];
          const reader = new FileReader();
          reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            if (
              imageLoaderComponent &&
              typeof imageLoaderComponent.loadImageFromUrlExposed === "function"
            ) {
              imageLoaderComponent.loadImageFromUrlExposed(dataUrl);
            }
          };
          reader.readAsDataURL(file);
        }
      });

      // Setup drag and drop events
      dropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropzone.classList.add("dragover");
      });

      dropzone.addEventListener("dragleave", () => {
        dropzone.classList.remove("dragover");
      });

      dropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropzone.classList.remove("dragover");
        if (e.dataTransfer && e.dataTransfer.files.length > 0) {
          const file = e.dataTransfer.files[0];
          const reader = new FileReader();
          reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            if (
              imageLoaderComponent &&
              typeof imageLoaderComponent.loadImageFromUrlExposed === "function"
            ) {
              imageLoaderComponent.loadImageFromUrlExposed(dataUrl);
            }
          };
          reader.readAsDataURL(file);
        }
      });

      // Make canvas available to our components
      setContext("canvasElement", canvas);
    }
  }

  // Event handler for image loaded event
  function handleImageLoaded(event: CustomEvent) {
    const { imageData } = event.detail;
    console.log("Image loaded in App component", imageData);

    // Hide dropzone and show canvas
    const dropzone = document.getElementById("dropzone");
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    if (dropzone && canvas) {
      dropzone.style.display = "none";
      canvas.style.display = "block";
      
      // Ensure the canvas is visible in the center of the app
      canvas.style.margin = "1rem auto";
      canvas.style.display = "block";
      canvas.style.maxWidth = "100%";
      canvas.style.border = "1px solid #ccc";
      canvas.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
      
      // Draw the image on the canvas right away for immediate feedback
      const ctx = canvas.getContext('2d');
      if (ctx && imageData) {
        // Set canvas dimensions to match image
        canvas.width = imageData.dimensions.width;
        canvas.height = imageData.dimensions.height;
        
        // Create ImageData object from our pixel data
        const canvasImageData = ctx.createImageData(imageData.dimensions.width, imageData.dimensions.height);
        canvasImageData.data.set(imageData.pixels);
        
        // Draw image data to canvas
        ctx.putImageData(canvasImageData, 0, 0);
      }
    }

    // Process image and update state
    // This will trigger further actions in other components
    const processImageEvent = new CustomEvent("posterize:processImage", {
      detail: { imageData },
    });
    document.dispatchEvent(processImageEvent);
    
    // Ensure we show a processed preview right away
    // This gives immediate feedback while other operations occur
    try {
      // Process image with current settings to show a preview
      const state = stateManagementService.getDefaultState();
      if (state) {
        const processedResult = imageProcessingService.processImage(imageData, state.posterizeSettings);
        if (processedResult && processedResult.processedImageData) {
          // Get the canvas and draw the processed image
          const canvas = document.getElementById("canvas") as HTMLCanvasElement;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              // Ensure canvas dimensions match image
              canvas.width = processedResult.processedImageData.dimensions.width;
              canvas.height = processedResult.processedImageData.dimensions.height;
              
              // Create ImageData and draw it
              const canvasImageData = ctx.createImageData(
                processedResult.processedImageData.dimensions.width,
                processedResult.processedImageData.dimensions.height
              );
              canvasImageData.data.set(processedResult.processedImageData.pixels);
              ctx.putImageData(canvasImageData, 0, 0);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error displaying image preview:", error);
    }
  }

  // Initialize application state and services
  onMount(() => {
    // Set up individual services in context
    setContext("stateManagementService", stateManagementService);
    setContext("imageProcessingService", imageProcessingService);
    setContext("vectorOutputService", vectorOutputService);
    setContext("vectorConversionService", vectorConversionService);

    // Also provide services as a single object for backward compatibility
    // This matches the context format expected by existing components
    setContext("services", {
      stateService: stateManagementService,
      imageService: imageProcessingService,
      vectorService: vectorOutputService,
      vectorConversionService: vectorConversionService,
      // Helper functions for common operations
      getCurrentImageData: () => imageLoaderComponent?.getCurrentImageData(),
      loadImageFromUrl: (url: string) =>
        imageLoaderComponent?.loadImageFromUrlExposed(url),
    });

    // Set up integration with existing HTML elements
    setupLegacyElementIntegration();

    // Set initial UI state
    const unsubscribe = posterizeState.subscribe((state) => {
      // Update UI based on state changes
      // This is where we would update controls based on the state
    });

    // Initialize the app
    appInitialized = true;

    // Set up event listeners for global app events
    const handleStateReset = () => {
      console.log("State reset detected, updating UI...");
    };

    document.addEventListener("posterize:stateReset", handleStateReset);

    return () => {
      // Cleanup when component is destroyed
      unsubscribe();
      document.removeEventListener("posterize:stateReset", handleStateReset);
    };
  });
</script>

<div class="posterize-app">
  {#if appInitialized}
    <div class="app-container">
      <div class="panels-container">
        <!-- Left panel: image loading and crop controls -->
        <div class="left-column">
          <div class="control-panel">
            <h2>Image</h2>
            <!-- @ts-ignore: Svelte component typing during migration -->
            <ImageLoader
              bind:this={imageLoaderComponent}
              on:imageLoaded={handleImageLoaded}
            />
          </div>

          <div class="control-panel">
            <h2>Dimensions</h2>
            <!-- @ts-ignore: Svelte component typing during migration -->
            <CropControl />
          </div>
        </div>

        <!-- Right panel: all other controls -->
        <div class="right-column">
          <div class="control-panel">
            <h2>Colors</h2>
            <!-- @ts-ignore: Svelte component typing during migration -->
            <ColorControl />
          </div>

          <div class="control-panel">
            <h2>Noise</h2>
            <!-- @ts-ignore: Svelte component typing during migration -->
            <NoiseControl />
          </div>

          <div class="control-panel">
            <h2>Smoothing</h2>
            <!-- @ts-ignore: Svelte component typing during migration -->
            <SmoothingControl />
          </div>

          <div class="control-panel">
            <h2>Borders</h2>
            <!-- @ts-ignore: Svelte component typing during migration -->
            <BorderControl />
          </div>

          <div class="control-panel">
            <h2>Vector</h2>
            <!-- @ts-ignore: Svelte component typing during migration -->
            <VectorControl />
          </div>

          <div class="control-panel">
            <h2>Export</h2>
            <!-- @ts-ignore: Svelte component typing during migration -->
            <ExportControl />
          </div>
        </div>
      </div>
    </div>
  {:else}
    <div class="loading-message">Initializing Posterize...</div>
  {/if}
</div>

<style>
  .posterize-app {
    font-family: "Arial", sans-serif;
    color: #333;
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
  }

  .app-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .panels-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
  }

  .left-column,
  .right-column {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
  }

  .control-panel {
    background-color: #f9f9f9;
    border-radius: 5px;
    padding: 1rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .loading-message {
    text-align: center;
    padding: 2rem;
    font-size: 1.2rem;
  }

  /* App title styling - add an H1 if needed */

  h2 {
    margin-top: 0;
    font-size: 1.2rem;
    color: #2c3e50;
    border-bottom: 1px solid #eee;
    padding-bottom: 0.5rem;
    margin-bottom: 1rem;
  }

  /* Media query for desktop */
  @media (min-width: 768px) {
    .panels-container {
      flex-direction: row;
      align-items: flex-start;
    }

    .left-column {
      width: 30%;
    }

    .right-column {
      width: 70%;
    }
  }
</style>
