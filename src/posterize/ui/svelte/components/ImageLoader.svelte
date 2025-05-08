<script lang="ts">
  /// <reference path="../types.d.ts" />
  /**
   * ImageLoader Component
   * 
   * Provides UI for loading and displaying images in the posterize app.
   * Replaces the ImageManager while maintaining DDD principles.
   */
  import { onMount, getContext, createEventDispatcher } from 'svelte';  
  import { get } from 'svelte/store';
  import { posterizeState } from '../stores/posterizeState';
  import { StateManagementService } from '../../../application/services/state-management-service';
  import { ImageProcessingService } from '../../../application/services/image-processing-service';
  import { ImageDataModel } from '../../../domain/models/image-data';
  import type { AspectRatioSetting } from '../../../types/interfaces';
  
  // Event dispatcher
  const dispatch = createEventDispatcher();
  
  // Get services from context (injected by parent)
  interface Services {
    stateService: StateManagementService;
    imageService: ImageProcessingService;
  }
  const services = getContext<Services>('services');
  const { stateService, imageService } = services;
  
  // Elements
  let dropzoneElement: HTMLElement;
  let fileInputElement: HTMLInputElement;
  let canvasElement: HTMLCanvasElement;
  
  // Local state
  let currentImageData: ImageDataModel | null = null;
  let originalImageDataUrl: string | null = null;
  let isDragging = false;
  
  /**
   * Bind drag and drop events
   */
  function setupDragAndDrop() {
    if (!dropzoneElement || !fileInputElement) return;
    
    // Click on dropzone to open file dialog
    dropzoneElement.addEventListener('click', () => {
      fileInputElement.click();
    });
    
    // Handle drag over
    dropzoneElement.addEventListener('dragover', (e) => {
      e.preventDefault();
      isDragging = true;
    });
    
    // Handle drag leave
    dropzoneElement.addEventListener('dragleave', () => {
      isDragging = false;
    });
    
    // Handle drop
    dropzoneElement.addEventListener('drop', (e) => {
      e.preventDefault();
      isDragging = false;
      
      if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
        loadImage(e.dataTransfer.files[0]);
      }
    });
    
    // Handle file input change
    fileInputElement.addEventListener('change', (e) => {
      if (fileInputElement.files && fileInputElement.files[0]) {
        loadImage(fileInputElement.files[0]);
      }
    });
  }
  
  /**
   * Load image from file
   */
  async function loadImage(file: File): Promise<void> {
    try {
      // Read file as data URL
      const reader = new FileReader();
      
      reader.onload = (e) => {
        if (e.target?.result) {
          const dataUrl = e.target.result as string;
          originalImageDataUrl = dataUrl;
          loadImageFromUrl(dataUrl);
        }
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error loading image:', error);
      alert('Failed to load image. Please try again.');
    }
  }
  
  /**
   * Load image from data URL
   */
  function loadImageFromUrl(url: string): void {
    if (!canvasElement) return;
    
    // Hide vector preview container during loading
    const vectorPreviewContainer = document.getElementById('vectorPreviewContainer');
    if (vectorPreviewContainer) {
      vectorPreviewContainer.style.display = 'none';
    }
    
    const img = new Image();
    
    img.onload = () => {
      // Get canvas context
      const ctx = canvasElement.getContext('2d');
      if (!ctx) return;
      
      // Calculate dimensions based on aspect ratio
      const { aspectRatio, mode } = $posterizeState.cropSettings;
      const ratio = parseAspectRatio(aspectRatio);
      
      let canvasW = 320, canvasH = 320;
      if (ratio >= 1) {
        canvasH = Math.round(320 / ratio);
      } else {
        canvasW = Math.round(320 * ratio);
      }
      
      // Resize canvas
      canvasElement.width = canvasW;
      canvasElement.height = canvasH;
      
      // Draw image based on crop mode
      if (mode === 'fit') {
        fitImage(img, ctx, canvasW, canvasH);
      } else {
        cropImage(img, ctx, canvasW, canvasH, ratio);
      }
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvasW, canvasH);
      currentImageData = ImageDataModel.fromCanvasImageData(imageData);
      
      // Show canvas
      canvasElement.style.display = '';
      
      // Save state - use the state service directly instead of trying to update the store
      // This fixes the "store.set is not a function" error
      const currentState = get(posterizeState);
      const updatedState = {
        ...currentState,
        originalImageDataUrl: url
      };
      stateService.saveState(updatedState);
      
      // Update the store using the correct store API method
      posterizeState.updatePartialState({
        originalImageDataUrl: url
      });
      
      // Signal that we have new image data
      dispatch('imageLoaded', { imageData: currentImageData });
      
      // Process image
      processImage();
    };
    
    img.src = url;
  }
  
  /**
   * Process the current image with current settings
   */
  function processImage(): void {
    if (!currentImageData || !canvasElement) return;
    
    // Get canvas context
    const ctx = canvasElement.getContext('2d');
    if (!ctx) return;
    
    // Process image
    const result = imageService.processImage(
      currentImageData,
      $posterizeState.posterizeSettings
    );
    
    // Draw processed image to canvas
    const { width, height } = result.processedImageData.dimensions;
    const canvasImageData = ctx.createImageData(width, height);
    canvasImageData.data.set(result.processedImageData.pixels);
    
    ctx.putImageData(
      canvasImageData,
      0,
      0
    );
    
    // Trigger vector preview generation
    const vectorPreviewEvent = new CustomEvent('posterize:generateVectorPreview');
    document.dispatchEvent(vectorPreviewEvent);
  }
  
  /**
   * Parse aspect ratio string into a number
   */
  function parseAspectRatio(val: AspectRatioSetting): number {
    if (val === '8.5:11') return 8.5 / 11;
    
    const [w, h] = val.split(':').map(Number);
    return w / h;
  }
  
  /**
   * Fit image into canvas (letterbox/pillarbox)
   */
  function fitImage(
    img: HTMLImageElement,
    ctx: CanvasRenderingContext2D,
    canvasW: number,
    canvasH: number
  ): void {
    const iw = img.width, ih = img.height;
    const scale = Math.min(canvasW / iw, canvasH / ih);
    const drawW = Math.round(iw * scale);
    const drawH = Math.round(ih * scale);
    const dx = Math.floor((canvasW - drawW) / 2);
    const dy = Math.floor((canvasH - drawH) / 2);
    
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.drawImage(img, 0, 0, iw, ih, dx, dy, drawW, drawH);
  }
  
  /**
   * Crop image to match aspect ratio
   */
  function cropImage(
    img: HTMLImageElement,
    ctx: CanvasRenderingContext2D,
    canvasW: number,
    canvasH: number,
    ratio: number
  ): void {
    const iw = img.width, ih = img.height;
    let cropW = iw, cropH = ih;
    
    if (iw / ih > ratio) {
      cropW = Math.round(ih * ratio);
      cropH = ih;
    } else {
      cropW = iw;
      cropH = Math.round(iw / ratio);
    }
    
    const sx = Math.floor((iw - cropW) / 2);
    const sy = Math.floor((ih - cropH) / 2);
    
    ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, canvasW, canvasH);
  }
  
  // Expose methods to parent component
  export function getCurrentImageData(): ImageDataModel | null {
    return currentImageData;
  }
  
  export function processCurrentImage(): void {
    processImage();
  }
  
  export function loadImageFromUrlExposed(url: string): void {
    loadImageFromUrl(url);
  }
  
  /**
   * Reset image and clear all related data
   * This method is called from the App component when the reset button is clicked
   */
  export function resetImage(): void {
    // Clear image data
    currentImageData = null;
    originalImageDataUrl = null;
    
    // Clear canvas if it exists
    if (canvasElement) {
      const ctx = canvasElement.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      }
      
      // Reset canvas dimensions to small default size
      canvasElement.width = 300;
      canvasElement.height = 150;
      canvasElement.style.display = 'none';
    }
    
    // Show dropzone
    if (dropzoneElement) {
      dropzoneElement.style.display = 'flex';
      dropzoneElement.classList.remove('hidden');
    }
    
    // Notify domain layer about image being reset
    dispatch('imageReset');
    
    console.log('Image reset complete');
  }
  
  // Initialize component
  onMount(() => {
    setupDragAndDrop();
    
    // Load image if available in the state
    if ($posterizeState.originalImageDataUrl) {
      originalImageDataUrl = $posterizeState.originalImageDataUrl;
      loadImageFromUrl($posterizeState.originalImageDataUrl);
    }
    
    // Listen for posterize:processImage events
    const handleProcessImage = () => processImage();
    document.addEventListener('posterize:processImage', handleProcessImage);
    
    // Add listener for state reset events from domain service
    const handleStateReset = (event: Event) => {
      console.log('ImageLoader: Handling state reset event');
      // Call our reset method to ensure the UI is properly updated
      resetImage();
    };
    document.addEventListener('posterize:stateReset', handleStateReset);
    
    return () => {
      document.removeEventListener('posterize:processImage', handleProcessImage);
      document.removeEventListener('posterize:stateReset', handleStateReset);
    };
  });
</script>

<div class="image-loader">
  <!-- Dropzone for image upload -->
  <div 
    bind:this={dropzoneElement}
    class="dropzone"
    class:dragover={isDragging}
  >
    <div class="dropzone-content">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="17 8 12 3 7 8"></polyline>
        <line x1="12" y1="3" x2="12" y2="15"></line>
      </svg>
      <p>Drop image here or click to upload</p>
    </div>
    
    <!-- Hidden file input -->
    <input 
      bind:this={fileInputElement}
      type="file" 
      id="fileInput" 
      accept="image/*" 
      style="display: none;"
    />
  </div>
  
  <!-- Canvas for displaying image -->
  <div class="canvas-container">
    <canvas 
      bind:this={canvasElement}
      id="canvas"
      style="display: none;" 
    ></canvas>
  </div>
</div>

<style>
  .image-loader {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 20px;
  }
  
  .dropzone {
    width: 100%;
    max-width: 320px;
    height: 180px;
    border: 2px dashed #ccc;
    border-radius: 4px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    margin-bottom: 20px;
    transition: border-color 0.3s, background-color 0.3s;
  }
  
  .dropzone:hover {
    border-color: #10b981;
    background-color: rgba(16, 185, 129, 0.05);
  }
  
  .dropzone.dragover {
    border-color: #10b981;
    background-color: rgba(16, 185, 129, 0.1);
  }
  
  .dropzone-content {
    text-align: center;
    color: #666;
  }
  
  .dropzone-content svg {
    margin-bottom: 8px;
    color: #10b981;
  }
  
  .dropzone-content p {
    margin: 0;
    font-size: 14px;
  }
  
  .canvas-container {
    width: 100%;
    display: flex;
    justify-content: center;
  }
  
  canvas {
    max-width: 100%;
    border: 1px solid #eee;
    border-radius: 4px;
  }
</style>
