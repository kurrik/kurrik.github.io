/**
 * Manager for crop controls
 */
import { BaseManager } from './base-manager';
import { ICropControlManager } from '../../types/manager-interfaces';
import { StateManagementService } from '../../application/services/state-management-service';
import { AspectRatioSetting } from '../../types/interfaces';
import { ImageManager } from './image-manager';

export class CropControlManager extends BaseManager implements ICropControlManager {
  private imageManager: ImageManager;

  constructor(
    stateManagementService: StateManagementService,
    imageManager: ImageManager
  ) {
    super(stateManagementService);
    this.imageManager = imageManager;
  }

  /**
   * Initialize element references and create UI controls
   */
  protected initializeElementReferences(): void {
    // Get container for aspect ratio controls
    const aspectRatioControlsContainer = document.getElementById('aspectRatioControlsContainer');
    
    // Initialize elements references
    this.elements = {
      aspectRatioControlsContainer
    };
    
    // Create aspect ratio and crop mode controls
    if (aspectRatioControlsContainer) {
      this.createAspectRatioControls(aspectRatioControlsContainer);
    }
  }
  
  /**
   * Create aspect ratio and crop mode controls
   */
  private createAspectRatioControls(container: HTMLElement): void {
    // Create header
    const header = document.createElement('div');
    header.className = 'control-header';
    header.textContent = 'Image Dimensions';
    header.style.fontWeight = 'bold';
    header.style.marginBottom = '10px';
    header.style.marginTop = '15px';
    container.appendChild(header);
    
    // Create aspect ratio control group
    const aspectRatioGroup = document.createElement('div');
    aspectRatioGroup.className = 'control-group';
    aspectRatioGroup.style.marginBottom = '15px';
    
    // Create aspect ratio label
    const aspectRatioLabel = document.createElement('label');
    aspectRatioLabel.htmlFor = 'aspectRatio';
    aspectRatioLabel.textContent = 'Aspect Ratio:';
    aspectRatioLabel.style.display = 'block';
    aspectRatioLabel.style.marginBottom = '5px';
    aspectRatioGroup.appendChild(aspectRatioLabel);
    
    // Create aspect ratio select
    const aspectRatioSelect = document.createElement('select');
    aspectRatioSelect.id = 'aspectRatio';
    aspectRatioSelect.style.width = '100%';
    aspectRatioSelect.style.padding = '5px';
    
    // Add options
    const aspectRatioOptions = [
      { value: 'original', text: 'Original' },
      { value: '1:1', text: 'Square (1:1)' },
      { value: '4:3', text: 'Standard (4:3)' },
      { value: '16:9', text: 'Widescreen (16:9)' },
      { value: '8.5:11', text: 'Letter (8.5:11)' }
    ];
    
    aspectRatioOptions.forEach(option => {
      const optionElement = document.createElement('option');
      optionElement.value = option.value;
      optionElement.textContent = option.text;
      aspectRatioSelect.appendChild(optionElement);
    });
    
    aspectRatioGroup.appendChild(aspectRatioSelect);
    container.appendChild(aspectRatioGroup);
    
    // Create crop mode control group
    const cropModeGroup = document.createElement('div');
    cropModeGroup.className = 'control-group';
    cropModeGroup.style.marginBottom = '15px';
    
    // Create crop mode label
    const cropModeLabel = document.createElement('label');
    cropModeLabel.htmlFor = 'cropMode';
    cropModeLabel.textContent = 'Fit Mode:';
    cropModeLabel.style.display = 'block';
    cropModeLabel.style.marginBottom = '5px';
    cropModeGroup.appendChild(cropModeLabel);
    
    // Create crop mode select
    const cropModeSelect = document.createElement('select');
    cropModeSelect.id = 'cropMode';
    cropModeSelect.style.width = '100%';
    cropModeSelect.style.padding = '5px';
    
    // Add options
    const cropModeOptions = [
      { value: 'crop', text: 'Crop to Fill' },
      { value: 'fit', text: 'Fit (Letterbox)' }
    ];
    
    cropModeOptions.forEach(option => {
      const optionElement = document.createElement('option');
      optionElement.value = option.value;
      optionElement.textContent = option.text;
      cropModeSelect.appendChild(optionElement);
    });
    
    cropModeGroup.appendChild(cropModeSelect);
    container.appendChild(cropModeGroup);
    
    // Store references
    this.elements.aspectRatioSelect = aspectRatioSelect;
    this.elements.cropModeSelect = cropModeSelect;
  }

  /**
   * Bind crop control events
   */
  public bindEvents(): void {
    this.bindCropControlEvents();
  }

  /**
   * Update crop controls based on state
   */
  protected updateControlsInternal(): void {
    const { aspectRatioSelect, cropModeSelect } = this.elements;
    if (aspectRatioSelect) {
      (aspectRatioSelect as HTMLSelectElement).value = this.currentState.cropSettings.aspectRatio;
    }
    if (cropModeSelect) {
      (cropModeSelect as HTMLSelectElement).value = this.currentState.cropSettings.mode;
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
        if (this.currentState.originalImageDataUrl) {
          this.imageManager.loadImageFromUrl(this.currentState.originalImageDataUrl);
        }
      });
    }

    if (cropModeSelect) {
      cropModeSelect.addEventListener('change', () => {
        this.currentState.cropSettings.mode =
          (cropModeSelect as HTMLSelectElement).value as 'crop' | 'fit';
        this.stateManagementService.saveState(this.currentState);

        // Reload image with new crop mode
        if (this.currentState.originalImageDataUrl) {
          this.imageManager.loadImageFromUrl(this.currentState.originalImageDataUrl);
        }
      });
    }
  }

  /**
   * Apply aspect ratio to image
   */
  public applyAspectRatio(
    img: HTMLImageElement,
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const mode = this.currentState.cropSettings.mode;
    const aspectRatio = this.currentState.cropSettings.aspectRatio;
    const ratio = this.parseAspectRatio(aspectRatio);

    if (mode === 'fit') {
      this.fitImage(img, ctx, width, height);
    } else {
      this.cropImage(img, ctx, width, height, ratio);
    }
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
}
