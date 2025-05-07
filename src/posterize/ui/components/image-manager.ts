/**
 * Manager for handling image operations
 */
import { BaseManager } from './base-manager';
import { IImageManager } from '../../types/manager-interfaces';
import { ImageDataModel } from '../../domain/models/image-data';
import { ImageProcessingService } from '../../application/services/image-processing-service';
import { StateManagementService } from '../../application/services/state-management-service';
import { AspectRatioSetting } from '../../types/interfaces';

export class ImageManager extends BaseManager implements IImageManager {
  private imageProcessingService: ImageProcessingService;
  private currentImageData: ImageDataModel | null = null;
  private originalImageDataUrl: string | null = null;

  constructor(
    imageProcessingService: ImageProcessingService,
    stateManagementService: StateManagementService
  ) {
    super(stateManagementService);
    this.imageProcessingService = imageProcessingService;
  }

  /**
   * Initialize element references needed by this manager
   */
  protected initializeElementReferences(): void {
    this.elements = {
      dropzone: document.getElementById('dropzone'),
      fileInput: document.getElementById('fileInput'),
      canvas: document.getElementById('canvas')
    };
  }

  /**
   * Bind image-related event handlers
   */
  public bindEvents(): void {
    this.bindDragAndDropEvents();
  }

  /**
   * Update image controls based on current state
   */
  protected updateControlsInternal(): void {
    // Load image if available in the state
    if (this.currentState.originalImageDataUrl) {
      this.originalImageDataUrl = this.currentState.originalImageDataUrl;
      this.loadImageFromUrl(this.currentState.originalImageDataUrl);
    }
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
   * Load image from file
   */
  public async loadImage(file: File): Promise<void> {
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
      alert('Failed to load image. Please try again.');
    }
  }

  /**
   * Load image from data URL
   */
  public loadImageFromUrl(url: string): void {
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
   * Get the current image data
   */
  public getCurrentImageData(): ImageDataModel | null {
    return this.currentImageData;
  }

  /**
   * Process current image with current settings
   */
  public processImage(): void {
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
    // Convert our ImageData to a canvas ImageData
    const { width, height } = result.processedImageData.dimensions;
    const canvasImageData = ctx.createImageData(width, height);
    canvasImageData.data.set(result.processedImageData.pixels);
    
    ctx.putImageData(
      canvasImageData,
      0,
      0
    );
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
