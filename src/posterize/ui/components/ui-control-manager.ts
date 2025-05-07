/**
 * UI component for managing control interactions
 */
import {
  IUIControlManager,
  AppState,
  AspectRatioSetting,
  CropMode
} from '../../types/interfaces';
import { ImageProcessingService } from '../../application/services/image-processing-service';
import { StateManagementService } from '../../application/services/state-management-service';
import { PosterizeSettingsModel } from '../../domain/models/posterize-settings';
import { VectorSettingsModel } from '../../domain/models/vector-settings';
import { ImageDataModel } from '../../domain/models/image-data';

export class UIControlManager implements IUIControlManager {
  private imageProcessingService: ImageProcessingService;
  private stateManagementService: StateManagementService;
  private currentState: AppState;
  private currentImageData: ImageDataModel | null = null;
  private originalImageDataUrl: string | null = null;
  
  // UI element references
  private elements: {
    [key: string]: HTMLElement | null;
  } = {};

  constructor(
    imageProcessingService: ImageProcessingService,
    stateManagementService: StateManagementService
  ) {
    this.imageProcessingService = imageProcessingService;
    this.stateManagementService = stateManagementService;
    this.currentState = stateManagementService.getDefaultState();
    
    // Initialize element references
    this.initializeElementReferences();
  }

  /**
   * Initialize references to DOM elements
   */
  private initializeElementReferences(): void {
    // Core elements
    this.elements = {
      dropzone: document.getElementById('dropzone'),
      fileInput: document.getElementById('fileInput'),
      canvas: document.getElementById('canvas'),
      
      // Color controls
      colorCountSlider: document.getElementById('colorCount'),
      colorCountLabel: document.getElementById('colorCountLabel'),
      thresholdControls: document.getElementById('thresholdControls'),
      
      // Crop controls
      aspectRatioSelect: document.getElementById('aspectRatio'),
      cropModeSelect: document.getElementById('cropMode'),
      
      // Border controls
      borderToggle: document.getElementById('borderToggle'),
      borderThicknessSlider: document.getElementById('borderThickness'),
      borderThicknessLabel: document.getElementById('borderThicknessLabel'),
      
      // Noise controls
      noiseEnable: document.getElementById('noiseEnable'),
      noiseThreshold: document.getElementById('noiseThreshold'),
      noiseThresholdLabel: document.getElementById('noiseThresholdLabel'),
      
      // Smoothing controls
      smoothEnable: document.getElementById('smoothEnable'),
      smoothStrength: document.getElementById('smoothStrength'),
      smoothStrengthLabel: document.getElementById('smoothStrengthLabel'),
      
      // Vector controls
      vectorPreviewBtn: document.getElementById('vectorPreviewBtn'),
      resetBtn: document.getElementById('resetBtn'),
      vectorPreviewContainer: document.getElementById('vectorPreviewContainer'),
      vectorPreview: document.getElementById('vectorPreview'),
      downloadSvgBtn: document.getElementById('downloadSvgBtn'),
      downloadZipBtn: document.getElementById('downloadZipBtn'),
      
      // Cross-hatching controls (new feature)
      crossHatchingToggle: document.getElementById('crossHatchingToggle'),
      crossHatchingDensity: document.getElementById('crossHatchingDensity'),
      crossHatchingDensityLabel: document.getElementById('crossHatchingDensityLabel'),
      crossHatchingAngle: document.getElementById('crossHatchingAngle'),
      crossHatchingAngleLabel: document.getElementById('crossHatchingAngleLabel')
    };
  }

  /**
   * Bind all control events
   */
  bindControlEvents(): void {
    this.bindDragAndDropEvents();
    this.bindColorControlEvents();
    this.bindCropControlEvents();
    this.bindBorderControlEvents();
    this.bindNoiseControlEvents();
    this.bindSmoothControlEvents();
    this.bindVectorControlEvents();
    this.bindCrossHatchingControlEvents();
    this.bindResetButton();
  }

  /**
   * Bind drag and drop events for image upload
   */
  private bindDragAndDropEvents(): void {
    const { dropzone, fileInput } = this.elements;
    
    if (dropzone && fileInput) {
      // Click on dropzone to open file dialog
      dropzone.addEventListener('click', () => {
        (fileInput as HTMLInputElement).click();
      });
      
      // Handle drag over
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
      
      // Handle drag leave
      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
      });
      
      // Handle drop
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        
        if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
          this.loadImage(e.dataTransfer.files[0]);
        }
      });
      
      // Handle file input change
      fileInput.addEventListener('change', (e) => {
        const input = e.target as HTMLInputElement;
        if (input.files && input.files[0]) {
          this.loadImage(input.files[0]);
        }
      });
    }
  }

  /**
   * Bind color control events
   */
  private bindColorControlEvents(): void {
    const { colorCountSlider, colorCountLabel } = this.elements;
    
    if (colorCountSlider && colorCountLabel) {
      colorCountSlider.addEventListener('input', () => {
        const value = parseInt((colorCountSlider as HTMLInputElement).value, 10);
        (colorCountLabel as HTMLElement).innerText = value.toString();
        
        // Update settings
        this.currentState.posterizeSettings.updateColorCount(value);
        this.stateManagementService.saveState(this.currentState);
        
        // Regenerate threshold controls
        this.renderThresholdControls();
        
        // Process image with new settings
        this.processImage();
      });
    }
  }

  /**
   * Bind crop control events
   */
  private bindCropControlEvents(): void {
    const { aspectRatioSelect, cropModeSelect } = this.elements;
    
    if (aspectRatioSelect) {
      aspectRatioSelect.addEventListener('change', () => {
        this.currentState.cropSettings.aspectRatio = 
          (aspectRatioSelect as HTMLSelectElement).value as AspectRatioSetting;
        this.stateManagementService.saveState(this.currentState);
        
        // Reload image with new aspect ratio
        if (this.originalImageDataUrl) {
          this.loadImageFromUrl(this.originalImageDataUrl);
        }
      });
    }
    
    if (cropModeSelect) {
      cropModeSelect.addEventListener('change', () => {
        this.currentState.cropSettings.mode =
          (cropModeSelect as HTMLSelectElement).value as CropMode;
        this.stateManagementService.saveState(this.currentState);
        
        // Reload image with new crop mode
        if (this.originalImageDataUrl) {
          this.loadImageFromUrl(this.originalImageDataUrl);
        }
      });
    }
  }

  /**
   * Bind border control events
   */
  private bindBorderControlEvents(): void {
    const { borderToggle, borderThicknessSlider, borderThicknessLabel } = this.elements;
    
    if (borderToggle && borderThicknessSlider && borderThicknessLabel) {
      borderToggle.addEventListener('change', () => {
        this.currentState.posterizeSettings.borderSettings.enabled = 
          (borderToggle as HTMLInputElement).checked;
        
        // Enable/disable thickness slider
        (borderThicknessSlider as HTMLInputElement).disabled = 
          !(borderToggle as HTMLInputElement).checked;
        
        this.stateManagementService.saveState(this.currentState);
        this.processImage();
      });
      
      borderThicknessSlider.addEventListener('input', () => {
        const value = parseInt((borderThicknessSlider as HTMLInputElement).value, 10);
        (borderThicknessLabel as HTMLElement).textContent = value.toString();
        
        this.currentState.posterizeSettings.borderSettings.thickness = value;
        this.stateManagementService.saveState(this.currentState);
        this.processImage();
      });
    }
  }

  /**
   * Bind noise control events
   */
  private bindNoiseControlEvents(): void {
    const { noiseEnable, noiseThreshold, noiseThresholdLabel } = this.elements;
    
    if (noiseEnable && noiseThreshold && noiseThresholdLabel) {
      noiseEnable.addEventListener('change', () => {
        this.currentState.posterizeSettings.noiseSettings.enabled = 
          (noiseEnable as HTMLInputElement).checked;
        
        // Enable/disable threshold slider
        (noiseThreshold as HTMLInputElement).disabled = 
          !(noiseEnable as HTMLInputElement).checked;
        
        this.stateManagementService.saveState(this.currentState);
        this.processImage();
      });
      
      noiseThreshold.addEventListener('input', () => {
        const value = parseInt((noiseThreshold as HTMLInputElement).value, 10);
        (noiseThresholdLabel as HTMLElement).innerText = value.toString();
        
        this.currentState.posterizeSettings.noiseSettings.minRegionSize = value;
        this.stateManagementService.saveState(this.currentState);
        
        if (this.currentState.posterizeSettings.noiseSettings.enabled) {
          this.processImage();
        }
      });
    }
  }

  /**
   * Bind smoothing control events
   */
  private bindSmoothControlEvents(): void {
    const { smoothEnable, smoothStrength, smoothStrengthLabel } = this.elements;
    
    if (smoothEnable && smoothStrength && smoothStrengthLabel) {
      smoothEnable.addEventListener('change', () => {
        this.currentState.posterizeSettings.smoothSettings.enabled = 
          (smoothEnable as HTMLInputElement).checked;
        
        // Enable/disable strength slider
        (smoothStrength as HTMLInputElement).disabled = 
          !(smoothEnable as HTMLInputElement).checked;
        
        this.stateManagementService.saveState(this.currentState);
        this.processImage();
      });
      
      smoothStrength.addEventListener('input', () => {
        const value = parseInt((smoothStrength as HTMLInputElement).value, 10);
        (smoothStrengthLabel as HTMLElement).innerText = value.toString();
        
        this.currentState.posterizeSettings.smoothSettings.strength = value;
        this.stateManagementService.saveState(this.currentState);
        
        if (this.currentState.posterizeSettings.smoothSettings.enabled) {
          this.processImage();
        }
      });
    }
  }

  /**
   * Bind vector preview and export events
   */
  private bindVectorControlEvents(): void {
    const { vectorPreviewBtn, downloadSvgBtn, downloadZipBtn } = this.elements;
    
    if (vectorPreviewBtn) {
      vectorPreviewBtn.addEventListener('click', () => {
        this.generateVectorPreview();
      });
    }
    
    // Additional vector controls will be implemented in the future
  }

  /**
   * Bind cross-hatching control events
   */
  private bindCrossHatchingControlEvents(): void {
    const { 
      crossHatchingToggle, 
      crossHatchingDensity, 
      crossHatchingDensityLabel,
      crossHatchingAngle,
      crossHatchingAngleLabel
    } = this.elements;
    
    // Implement cross-hatching controls once UI is updated
    if (crossHatchingToggle) {
      crossHatchingToggle.addEventListener('change', () => {
        this.currentState.vectorSettings.crossHatchingSettings.enabled = 
          (crossHatchingToggle as HTMLInputElement).checked;
        
        // Update UI based on cross-hatching state
        if (crossHatchingDensity && crossHatchingAngle) {
          (crossHatchingDensity as HTMLInputElement).disabled = 
            !(crossHatchingToggle as HTMLInputElement).checked;
          (crossHatchingAngle as HTMLInputElement).disabled = 
            !(crossHatchingToggle as HTMLInputElement).checked;
        }
        
        this.stateManagementService.saveState(this.currentState);
        this.generateVectorPreview();
      });
    }
    
    // Add other cross-hatching control bindings
  }

  /**
   * Bind reset button
   */
  private bindResetButton(): void {
    const { resetBtn } = this.elements;
    
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetApplication();
      });
    }
  }

  /**
   * Load image from file
   */
  private async loadImage(file: File): Promise<void> {
    try {
      // Read file as data URL
      const reader = new FileReader();
      
      reader.onload = (e) => {
        if (e.target?.result) {
          const dataUrl = e.target.result as string;
          this.originalImageDataUrl = dataUrl;
          this.loadImageFromUrl(dataUrl);
        }
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error loading image:', error);
    }
  }

  /**
   * Load image from data URL
   */
  private loadImageFromUrl(url: string): void {
    const { canvas } = this.elements;
    if (!canvas) return;
    
    const img = new Image();
    
    img.onload = () => {
      // Get canvas context
      const canvasElement = canvas as HTMLCanvasElement;
      const ctx = canvasElement.getContext('2d');
      if (!ctx) return;
      
      // Calculate dimensions based on aspect ratio
      const { aspectRatio, mode } = this.currentState.cropSettings;
      const ratio = this.parseAspectRatio(aspectRatio);
      
      let canvasW = 320, canvasH = 320;
      if (ratio >= 1) {
        canvasH = Math.round(320 / ratio);
      } else {
        canvasW = Math.round(320 * ratio);
      }
      
      // Resize canvas
      canvasElement.width = canvasW;
      canvasElement.height = canvasH;
      ctx.clearRect(0, 0, canvasW, canvasH);
      
      // Draw image based on crop mode
      if (mode === 'fit') {
        this.fitImage(img, ctx, canvasW, canvasH);
      } else {
        this.cropImage(img, ctx, canvasW, canvasH, ratio);
      }
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvasW, canvasH);
      this.currentImageData = ImageDataModel.fromCanvasImageData(imageData);
      
      // Show canvas
      canvasElement.style.display = '';
      
      // Save state
      this.currentState.originalImageDataUrl = url;
      this.stateManagementService.saveState(this.currentState);
      
      // Process image
      this.processImage();
    };
    
    img.src = url;
  }

  /**
   * Parse aspect ratio string into a number
   */
  private parseAspectRatio(val: AspectRatioSetting): number {
    if (val === '8.5:11') return 8.5 / 11;
    
    const [w, h] = val.split(':').map(Number);
    return w / h;
  }

  /**
   * Fit image into canvas (letterbox/pillarbox)
   */
  private fitImage(
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
  private cropImage(
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

  /**
   * Process current image with current settings
   */
  private processImage(): void {
    if (!this.currentImageData) return;
    
    const { canvas } = this.elements;
    if (!canvas) return;
    
    // Get canvas context
    const canvasElement = canvas as HTMLCanvasElement;
    const ctx = canvasElement.getContext('2d');
    if (!ctx) return;
    
    // Process image
    const result = this.imageProcessingService.processImage(
      this.currentImageData,
      this.currentState.posterizeSettings
    );
    
    // Draw processed image to canvas
    ctx.putImageData(
      result.processedImageData.toCanvasImageData(),
      0,
      0
    );
  }

  /**
   * Generate vector preview
   */
  private generateVectorPreview(): void {
    // This is a placeholder for now
    // In the full implementation, this will generate a vector preview
    // using the VectorConversionService
    
    console.log('Vector preview generation not yet implemented');
  }

  /**
   * Render threshold controls based on current color count
   */
  private renderThresholdControls(): void {
    const { thresholdControls } = this.elements;
    if (!thresholdControls) return;
    
    // Clear existing controls
    thresholdControls.innerHTML = '';
    
    // Get current settings
    const { colorCount, thresholds } = this.currentState.posterizeSettings;
    
    // Create sliders for each threshold
    for (let i = 0; i < colorCount - 1; i++) {
      const group = document.createElement('div');
      group.className = 'threshold-slider';
      
      const label = document.createElement('label');
      label.innerText = `Threshold ${i + 1}`;
      
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '0';
      slider.max = '255';
      slider.value = thresholds[i].toString();
      slider.step = '1';
      
      const value = document.createElement('span');
      value.innerText = slider.value;
      
      // Add event listener
      slider.addEventListener('input', () => {
        const val = parseInt(slider.value, 10);
        value.innerText = val.toString();
        
        // Update threshold value
        this.currentState.posterizeSettings.thresholds[i] = val;
        this.stateManagementService.saveState(this.currentState);
        this.processImage();
      });
      
      // Add elements to group
      group.appendChild(label);
      group.appendChild(slider);
      group.appendChild(value);
      
      // Add group to controls
      thresholdControls.appendChild(group);
    }
  }

  /**
   * Reset the application to default state
   */
  private resetApplication(): void {
    // Get default state
    this.currentState = this.stateManagementService.getDefaultState();
    
    // Remove original image
    this.originalImageDataUrl = null;
    this.currentImageData = null;
    
    // Reset UI
    this.updateControls(this.currentState);
    
    // Clear localStorage
    this.stateManagementService.saveState(this.currentState);
    
    // Hide canvas and vector preview
    const { canvas, vectorPreviewContainer, fileInput } = this.elements;
    if (canvas) (canvas as HTMLCanvasElement).style.display = 'none';
    if (vectorPreviewContainer) (vectorPreviewContainer as HTMLElement).style.display = 'none';
    if (fileInput) (fileInput as HTMLInputElement).value = '';
  }

  /**
   * Update UI controls to reflect current state
   */
  updateControls(state: AppState): void {
    this.currentState = state;
    
    // Update color count
    const { colorCountSlider, colorCountLabel } = this.elements;
    if (colorCountSlider && colorCountLabel) {
      (colorCountSlider as HTMLInputElement).value = state.posterizeSettings.colorCount.toString();
      (colorCountLabel as HTMLElement).innerText = state.posterizeSettings.colorCount.toString();
    }
    
    // Update threshold controls
    this.renderThresholdControls();
    
    // Update aspect ratio and crop mode
    const { aspectRatioSelect, cropModeSelect } = this.elements;
    if (aspectRatioSelect) {
      (aspectRatioSelect as HTMLSelectElement).value = state.cropSettings.aspectRatio;
    }
    if (cropModeSelect) {
      (cropModeSelect as HTMLSelectElement).value = state.cropSettings.mode;
    }
    
    // Update border controls
    const { borderToggle, borderThicknessSlider, borderThicknessLabel } = this.elements;
    if (borderToggle && borderThicknessSlider && borderThicknessLabel) {
      (borderToggle as HTMLInputElement).checked = state.posterizeSettings.borderSettings.enabled;
      (borderThicknessSlider as HTMLInputElement).value = state.posterizeSettings.borderSettings.thickness.toString();
      (borderThicknessLabel as HTMLElement).textContent = state.posterizeSettings.borderSettings.thickness.toString();
      (borderThicknessSlider as HTMLInputElement).disabled = !state.posterizeSettings.borderSettings.enabled;
    }
    
    // Update noise controls
    const { noiseEnable, noiseThreshold, noiseThresholdLabel } = this.elements;
    if (noiseEnable && noiseThreshold && noiseThresholdLabel) {
      (noiseEnable as HTMLInputElement).checked = state.posterizeSettings.noiseSettings.enabled;
      (noiseThreshold as HTMLInputElement).value = state.posterizeSettings.noiseSettings.minRegionSize.toString();
      (noiseThresholdLabel as HTMLElement).innerText = state.posterizeSettings.noiseSettings.minRegionSize.toString();
      (noiseThreshold as HTMLInputElement).disabled = !state.posterizeSettings.noiseSettings.enabled;
    }
    
    // Update smoothing controls
    const { smoothEnable, smoothStrength, smoothStrengthLabel } = this.elements;
    if (smoothEnable && smoothStrength && smoothStrengthLabel) {
      (smoothEnable as HTMLInputElement).checked = state.posterizeSettings.smoothSettings.enabled;
      (smoothStrength as HTMLInputElement).value = state.posterizeSettings.smoothSettings.strength.toString();
      (smoothStrengthLabel as HTMLElement).innerText = state.posterizeSettings.smoothSettings.strength.toString();
      (smoothStrength as HTMLInputElement).disabled = !state.posterizeSettings.smoothSettings.enabled;
    }
    
    // Update cross-hatching controls (if they exist)
    const { crossHatchingToggle, crossHatchingDensity, crossHatchingAngle } = this.elements;
    if (crossHatchingToggle && crossHatchingDensity && crossHatchingAngle) {
      (crossHatchingToggle as HTMLInputElement).checked = state.vectorSettings.crossHatchingSettings.enabled;
      (crossHatchingDensity as HTMLInputElement).value = state.vectorSettings.crossHatchingSettings.density.toString();
      (crossHatchingAngle as HTMLInputElement).value = state.vectorSettings.crossHatchingSettings.angle.toString();
      
      (crossHatchingDensity as HTMLInputElement).disabled = !state.vectorSettings.crossHatchingSettings.enabled;
      (crossHatchingAngle as HTMLInputElement).disabled = !state.vectorSettings.crossHatchingSettings.enabled;
    }
    
    // Load image if available
    if (state.originalImageDataUrl) {
      this.originalImageDataUrl = state.originalImageDataUrl;
      this.loadImageFromUrl(state.originalImageDataUrl);
    }
  }
}
