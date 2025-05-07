/**
 * UI component for managing control interactions
 */
import {
  IUIControlManager,
  AppState,
  AspectRatioSetting,
  CropMode,
  VectorOutput,
  VectorLayer,
  VectorPathData,
  ImageProcessingResult,
  VectorConversionResult
} from '../../types/interfaces';
import { ImageProcessingService } from '../../application/services/image-processing-service';
import { StateManagementService } from '../../application/services/state-management-service';
import { PosterizeSettingsModel } from '../../domain/models/posterize-settings';
import { VectorSettingsModel } from '../../domain/models/vector-settings';
import { ImageDataModel } from '../../domain/models/image-data';
import { IPreviewManager } from '../../types/interfaces';
import { ILayerPanelManager } from '../../types/interfaces';

// Declare global interfaces for our app components
declare global {
  interface Window {
    previewManager?: IPreviewManager;
    layerPanelManager?: ILayerPanelManager;
    JSZip?: any; // For the JSZip library
  }
}

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
   * Direct DOM manipulation fallback for vector preview
   * Used when the PreviewManager is not available
   */
  private renderVectorPreviewFallback(vectorOutput: VectorOutput): void {
    const vectorPreviewElement = document.getElementById('vectorPreview');
    if (!vectorPreviewElement) return;

    // Clear existing content
    vectorPreviewElement.innerHTML = '';

    // Create the SVG elements for preview
    const { width, height } = vectorOutput.dimensions;
    const svgNS = 'http://www.w3.org/2000/svg';

    // Create container for layers
    const layersDiv = document.createElement('div');
    layersDiv.style.position = 'relative';
    layersDiv.style.width = `${width}px`;
    layersDiv.style.height = `${height}px`;
    layersDiv.style.margin = '0 auto';

    // Add background
    const bgDiv = document.createElement('div');
    bgDiv.style.position = 'absolute';
    bgDiv.style.left = '0';
    bgDiv.style.top = '0';
    bgDiv.style.width = '100%';
    bgDiv.style.height = '100%';
    bgDiv.style.background = vectorOutput.background;
    layersDiv.appendChild(bgDiv);

    // Add each SVG layer
    vectorOutput.layers.forEach((layer, i) => {
      if (!layer.visible) return;

      const svgElem = document.createElementNS(svgNS, 'svg');
      svgElem.setAttribute('width', width.toString());
      svgElem.setAttribute('height', height.toString());
      svgElem.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svgElem.style.position = 'absolute';
      svgElem.style.left = '0';
      svgElem.style.top = '0';
      svgElem.style.width = '100%';
      svgElem.style.height = '100%';
      svgElem.style.zIndex = (i + 1).toString();

      layer.paths.forEach(path => {
        const pathElem = document.createElementNS(svgNS, 'path');
        pathElem.setAttribute('d', path.d);
        pathElem.setAttribute('fill', path.fill);
        pathElem.setAttribute('stroke', path.stroke || 'none');
        pathElem.setAttribute('stroke-width', path.strokeWidth || '0');
        svgElem.appendChild(pathElem);
      });

      layersDiv.appendChild(svgElem);
    });

    vectorPreviewElement.appendChild(layersDiv);
  }

  /**
   * Generate vector preview
   */
  private generateVectorPreview(): void {
    if (!this.currentImageData) {
      alert('Please load an image first.');
      return;
    }

    // Get the canvas element
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (!canvas) {
      console.error('Canvas element not found');
      return;
    }

    // Get the current image data from the canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get canvas context');
      return;
    }

    // Extract the image data from the canvas
    const canvasImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Prepare image data for processing using our custom ImageData interface
    const processedImageData = {
      dimensions: {
        width: canvas.width,
        height: canvas.height
      },
      pixels: canvasImageData.data
    };

    // Create a result object with processed image data and empty buckets
    const result = {
      processedImageData: processedImageData,
      buckets: new Uint8Array(canvas.width * canvas.height)
    };

    // Get the thresholds and color count from the current state
    const colorCount = this.currentState.posterizeSettings.colorCount;
    const thresholds = this.currentState.posterizeSettings.thresholds;

    try {
      // Show the bezier slider group and update the value
      const bezierSliderGroup = document.getElementById('bezierSliderGroup');
      if (bezierSliderGroup) {
        bezierSliderGroup.style.display = 'block';
      }

      // Update curve smoothing from slider
      const bezierSlider = document.getElementById('bezierSlider') as HTMLInputElement;
      if (bezierSlider) {
        const curveSmoothing = parseInt(bezierSlider.value, 10);
        this.currentState.vectorSettings.curveSmoothing = curveSmoothing;
      }

      // Process the image data into buckets
      const width = canvas.width;
      const height = canvas.height;
      const data = canvasImageData.data;
      const buckets = new Uint8Array(width * height);

      // Apply thresholds to create color buckets
      for (let y = 0; y < height; ++y) {
        for (let x = 0; x < width; ++x) {
          const i = (y * width + x) * 4;
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          let bucket = 0;
          while (bucket < thresholds.length && lum > thresholds[bucket]) bucket++;
          buckets[y * width + x] = bucket;
        }
      }

      // Apply noise removal if enabled
      if (this.currentState.posterizeSettings.noiseSettings.enabled) {
        const minSize = this.currentState.posterizeSettings.noiseSettings.minRegionSize;
        this.removeNoise(buckets, width, height, minSize, colorCount);
      }

      // Apply smoothing if enabled
      if (this.currentState.posterizeSettings.smoothSettings.enabled) {
        const strength = this.currentState.posterizeSettings.smoothSettings.strength;
        this.smoothBuckets(buckets, width, height, colorCount, strength);
      }

      // Check if OpenCV is loaded
      if (typeof cv === 'undefined') {
        alert('OpenCV.js is not loaded yet. Please wait a moment and try again.');
        return;
      }

      // Prepare for SVG generation
      const svgNS = 'http://www.w3.org/2000/svg';
      const svgElems: SVGElement[] = [];
      const combinedPaths: string[] = [];
      const vectorLayers: VectorLayer[] = [];

      // Process each color bucket to generate SVG paths
      for (let bucket = 0; bucket < colorCount; ++bucket) {
        // Create a mask for this bucket
        const mask = new cv.Mat.zeros(height, width, cv.CV_8UC1);
        for (let y = 0; y < height; ++y) {
          for (let x = 0; x < width; ++x) {
            if (buckets[y * width + x] === bucket) {
              mask.ucharPtr(y, x)[0] = 255;
            }
          }
        }

        // Find contours with hierarchy
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        cv.findContours(mask, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);

        // Build contour tree from hierarchy
        const contourTree: any[] = [];
        const n = contours.size();
        const hier = hierarchy.data32S;

        for (let i = 0; i < n; ++i) {
          contourTree.push({
            idx: i,
            children: [],
            parent: hier[i * 4 + 3],
            next: hier[i * 4],
            prev: hier[i * 4 + 1],
            firstChild: hier[i * 4 + 2]
          });
        }

        // Link children to parents
        for (let i = 0; i < n; ++i) {
          if (contourTree[i].parent !== -1) {
            contourTree[contourTree[i].parent].children.push(i);
          }
        }

        // Function to check if contour is the image border
        const isContourImageBorder = (cnt: any, w: number, h: number): boolean => {
          if (cnt.data32S.length !== 8) return false; // Rectangle should have 4 points
          const pts: number[][] = [];
          for (let j = 0; j < cnt.data32S.length; j += 2) {
            pts.push([cnt.data32S[j], cnt.data32S[j + 1]]);
          }

          // The border can be clockwise or counterclockwise
          const border1 = [[0, 0], [w - 1, 0], [w - 1, h - 1], [0, h - 1]];
          const border2 = [[0, 0], [0, h - 1], [w - 1, h - 1], [w - 1, 0]];

          const match = (a: number[][], b: number[][]): boolean =>
            a.every((pt, i) => pt[0] === b[i][0] && pt[1] === b[i][1]);

          return match(pts, border1) || match(pts, border2);
        };

        // Convert contour to SVG path
        const contourToPath = (cnt: any): string => {
          let path = '';
          if (cnt.data32S.length < 2) return path;

          for (let j = 0; j < cnt.data32S.length; j += 2) {
            const x = cnt.data32S[j], y = cnt.data32S[j + 1];
            if (j === 0) path += `M${x},${y}`;
            else path += `L${x},${y}`;
          }

          path += 'Z'; // Close the path
          return path;
        };

        // Helper: Get bounding box for a contour
        const getBoundingBox = (cnt: any) => {
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (let j = 0; j < cnt.data32S.length; j += 2) {
            const x = cnt.data32S[j], y = cnt.data32S[j + 1];
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
          return { minX, minY, maxX, maxY };
        };

        // Helper: Check if two bounding boxes intersect
        const boxesIntersect = (a: any, b: any): boolean => {
          return !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY);
        };

        // Mark contours as used or not
        const used = new Array(n).fill(false);

        // Collect all filled regions (even depth)
        const regionGroups: string[][] = [];
        const regionBoxes: any[][] = [];

        const collectRegions = (idx: number, depth = 0): void => {
          // Skip if already processed
          if (used[idx]) return;

          // Allow the image border contour only if border is enabled and this is the top (white) bucket
          const isBorder = isContourImageBorder(contours.get(idx), width, height);
          if (isBorder && !this.currentState.posterizeSettings.borderSettings.enabled && bucket === colorCount - 1) {
            used[idx] = true;
            for (const childIdx of contourTree[idx].children) {
              collectRegions(childIdx, depth + 1);
            }
            return;
          }

          // Only process even-depth contours as filled regions, odd-depth contours are holes
          if (depth % 2 === 0) {
            const cnt = contours.get(idx);
            const pathData = contourToPath(cnt);
            const bbox = getBoundingBox(cnt);

            // Try to merge with an existing group if no intersection
            let merged = false;
            for (let g = 0; g < regionGroups.length; ++g) {
              const groupBoxes = regionBoxes[g];
              const intersects = groupBoxes.some(box => boxesIntersect(box, bbox));
              if (!intersects) {
                regionGroups[g].push(pathData);
                groupBoxes.push(bbox);
                merged = true;
                break;
              }
            }

            if (!merged) {
              regionGroups.push([pathData]);
              regionBoxes.push([bbox]);
            }
          }

          used[idx] = true;

          // Process children
          for (const childIdx of contourTree[idx].children) {
            collectRegions(childIdx, depth + 1);
          }
        };

        // Collect regions starting from root contours
        for (let i = 0; i < n; ++i) {
          if (contourTree[i].parent === -1) collectRegions(i, 0);
        }

        // Generate SVG elements and paths for this bucket
        const layerPaths: VectorPathData[] = [];
        const color = `hsla(${bucket * 360 / colorCount}, 80%, 60%, 0.55)`;

        for (const group of regionGroups) {
          const pathData = group.join(' ');

          // Create SVG element for preview
          const svgElem = document.createElementNS(svgNS, 'svg');
          svgElem.setAttribute('width', width.toString());
          svgElem.setAttribute('height', height.toString());
          svgElem.setAttribute('viewBox', `0 0 ${width} ${height}`);

          // Create path element
          const pathElem = document.createElementNS(svgNS, 'path');
          pathElem.setAttribute('d', pathData);
          pathElem.setAttribute('fill', color);
          pathElem.setAttribute('stroke', '#333');
          pathElem.setAttribute('stroke-width', '0.7');

          svgElem.appendChild(pathElem);
          svgElem.style.margin = '8px 0';
          svgElems.push(svgElem);

          // Add to combined paths for export
          combinedPaths.push(`<path d="${pathData}" fill="${color}" stroke="#333" stroke-width="0.7"/>`);

          // Add to vector layer
          layerPaths.push({
            d: pathData,
            fill: color,
            stroke: '#333',
            strokeWidth: '0.7'
          });
        }

        // Add layer to vector output
        if (layerPaths.length > 0) {
          vectorLayers.push({
            id: `layer-${bucket}`,
            paths: layerPaths,
            visible: true
          });
        }

        // Clean up OpenCV resources
        mask.delete();
        contours.delete();
        hierarchy.delete();
      }

      // Prepare final vector output
      const vectorOutput: VectorOutput = {
        dimensions: {
          width: width,
          height: height
        },
        layers: vectorLayers,
        background: '#ffffff'
      };

      // Use the preview manager to render the vector preview
      if (window.previewManager && typeof window.previewManager.renderVectorPreview === 'function') {
        window.previewManager.renderVectorPreview(vectorOutput);
      } else {
        // Fallback to direct DOM manipulation
        this.renderVectorPreviewFallback(vectorOutput);
      }

      // Try to use the layer panel manager if available
      if (window.layerPanelManager && typeof window.layerPanelManager.createLayerControls === 'function') {
        window.layerPanelManager.createLayerControls(vectorOutput);
      }

      // Show vector preview container
      const vectorPreviewContainer = document.getElementById('vectorPreviewContainer');
      if (vectorPreviewContainer) {
        vectorPreviewContainer.style.display = 'flex';
      }

      // Enable download buttons
      const downloadSvgBtn = document.getElementById('downloadSvgBtn');
      if (downloadSvgBtn) {
        downloadSvgBtn.style.display = 'block';
        downloadSvgBtn.onclick = () => this.downloadSvgFile(vectorOutput);
      }

      const downloadZipBtn = document.getElementById('downloadZipBtn');
      if (downloadZipBtn) {
        downloadZipBtn.style.display = 'block';
        downloadZipBtn.onclick = () => this.downloadLayersAsZip(vectorOutput);
      }

      // Show cross-hatching controls if enabled
      const crossHatchingControls = document.getElementById('crossHatchingControls');
      if (crossHatchingControls) {
        crossHatchingControls.style.display = 'block';
      }

      // Save the current state
      this.stateManagementService.saveState(this.currentState);
    } catch (error) {
      console.error('Error generating vector preview:', error);
      alert('Failed to generate vector preview. See console for details.');
    }
  }

  /**
   * Download vector output as SVG file
   */
  /**
   * Noise removal helper method
   */
  private removeNoise(buckets: Uint8Array, width: number, height: number, minSize: number, colorCount: number): void {
    if (minSize <= 1) return; // No need to process

    // For each color bucket
    for (let color = 0; color < colorCount; ++color) {
      // Create a binary mask for this color
      const mask = new Array(width * height).fill(false);
      for (let i = 0; i < buckets.length; ++i) {
        mask[i] = buckets[i] === color;
      }

      // Find connected components
      const labels = new Array(width * height).fill(0);
      let nextLabel = 1;

      // First pass: label components
      for (let y = 0; y < height; ++y) {
        for (let x = 0; x < width; ++x) {
          const idx = y * width + x;
          if (!mask[idx]) continue;

          // Check neighbors (4-connectivity)
          const neighbors = [];
          if (x > 0 && mask[idx - 1]) neighbors.push(labels[idx - 1]);
          if (y > 0 && mask[idx - width]) neighbors.push(labels[idx - width]);

          if (neighbors.length === 0) {
            // New component
            labels[idx] = nextLabel++;
          } else {
            // Assign smallest label among neighbors
            labels[idx] = Math.min(...neighbors.filter(l => l > 0));
          }
        }
      }

      // Count size of each component
      const componentSizes = new Array(nextLabel).fill(0);
      for (let i = 0; i < labels.length; ++i) {
        if (labels[i] > 0) {
          componentSizes[labels[i]]++;
        }
      }

      // Remove small components
      for (let i = 0; i < buckets.length; ++i) {
        if (buckets[i] === color && labels[i] > 0 && componentSizes[labels[i]] < minSize) {
          // Find most frequent neighbor color
          const neighborColors = [];
          const x = i % width;
          const y = Math.floor(i / width);

          // Check 8-connected neighbors
          for (let ny = Math.max(0, y - 1); ny <= Math.min(y + 1, height - 1); ++ny) {
            for (let nx = Math.max(0, x - 1); nx <= Math.min(x + 1, width - 1); ++nx) {
              if (nx === x && ny === y) continue;
              const nidx = ny * width + nx;
              if (buckets[nidx] !== color) {
                neighborColors.push(buckets[nidx]);
              }
            }
          }

          // Find most frequent neighbor color
          if (neighborColors.length > 0) {
            const colorCounts = new Array(colorCount).fill(0);
            for (const c of neighborColors) {
              colorCounts[c]++;
            }

            let maxColor = 0;
            let maxCount = 0;
            for (let c = 0; c < colorCount; ++c) {
              if (colorCounts[c] > maxCount) {
                maxCount = colorCounts[c];
                maxColor = c;
              }
            }

            buckets[i] = maxColor;
          }
        }
      }
    }
  }

  /**
   * Smooth buckets helper method
   */
  private smoothBuckets(buckets: Uint8Array, width: number, height: number, colorCount: number, iterations: number): void {
    if (iterations <= 0) return; // No need to process

    // Create a copy of the buckets array
    const tempBuckets = new Uint8Array(buckets.length);

    for (let iter = 0; iter < iterations; ++iter) {
      // Copy current state to temp buffer
      tempBuckets.set(buckets);

      // Apply smoothing
      for (let y = 1; y < height - 1; ++y) {
        for (let x = 1; x < width - 1; ++x) {
          const idx = y * width + x;
          const currentColor = tempBuckets[idx];

          // Count colors in 3x3 neighborhood
          const colorCounts = new Array(colorCount).fill(0);
          for (let ny = y - 1; ny <= y + 1; ++ny) {
            for (let nx = x - 1; nx <= x + 1; ++nx) {
              const nidx = ny * width + nx;
              colorCounts[tempBuckets[nidx]]++;
            }
          }

          // Find most frequent color
          let maxColor = currentColor;
          let maxCount = 0;
          for (let c = 0; c < colorCount; ++c) {
            if (colorCounts[c] > maxCount) {
              maxCount = colorCounts[c];
              maxColor = c;
            }
          }

          // Update color if different
          if (maxColor !== currentColor) {
            buckets[idx] = maxColor;
          }
        }
      }
    }
  }

  /**
   * Helper method to create layer controls for vector preview
   */
  private createVectorLayerControls(svgElems: SVGElement[], width: number, height: number, combinedPaths: string[]): void {
    // Get or create vector preview element
    const vectorPreviewElement = document.getElementById('vectorPreview');
    if (!vectorPreviewElement) return;

    // Clear existing content
    vectorPreviewElement.innerHTML = '';

    // Create layer controls container
    const layerControls = document.createElement('div');
    layerControls.style.display = 'flex';
    layerControls.style.flexWrap = 'wrap';
    layerControls.style.gap = '8px';
    layerControls.style.marginBottom = '10px';
    layerControls.style.alignItems = 'center';

    // Create enable/disable all buttons
    const enableAllBtn = document.createElement('button');
    enableAllBtn.textContent = 'Enable All';
    enableAllBtn.style.marginRight = '6px';

    const disableAllBtn = document.createElement('button');
    disableAllBtn.textContent = 'Disable All';
    disableAllBtn.style.marginRight = '16px';

    layerControls.appendChild(enableAllBtn);
    layerControls.appendChild(disableAllBtn);

    // Create array to store layer checkboxes
    const layerCheckboxes: HTMLInputElement[] = [];

    // Background layer control
    const bgLabel = document.createElement('label');
    bgLabel.style.display = 'flex';
    bgLabel.style.alignItems = 'center';
    bgLabel.style.gap = '4px';

    const bgCb = document.createElement('input');
    bgCb.type = 'checkbox';
    bgCb.checked = true;

    const bgSwatch = document.createElement('span');
    const bgColor = '#f7f7f7';
    bgSwatch.style.display = 'inline-block';
    bgSwatch.style.width = '16px';
    bgSwatch.style.height = '16px';
    bgSwatch.style.background = bgColor;
    bgSwatch.style.border = '1px solid #888';
    bgSwatch.style.borderRadius = '3px';

    bgLabel.appendChild(bgCb);
    bgLabel.appendChild(bgSwatch);
    bgLabel.appendChild(document.createTextNode('Background'));
    layerControls.appendChild(bgLabel);

    // Add event handlers for the enable/disable all buttons
    enableAllBtn.onclick = () => {
      layerCheckboxes.forEach(cb => {
        cb.checked = true;
        cb.dispatchEvent(new Event('change'));
      });
      bgCb.checked = true;
      bgCb.dispatchEvent(new Event('change'));
    };

    disableAllBtn.onclick = () => {
      layerCheckboxes.forEach(cb => {
        cb.checked = false;
        cb.dispatchEvent(new Event('change'));
      });
      bgCb.checked = false;
      bgCb.dispatchEvent(new Event('change'));
    };

    // Create SVG container with white background
    const containerDiv = document.createElement('div');
    containerDiv.style.position = 'relative';
    containerDiv.style.width = `${width}px`;
    containerDiv.style.height = `${height}px`;
    containerDiv.style.margin = '0 auto';
    containerDiv.style.backgroundColor = '#ffffff';

    // Background handler
    bgCb.onchange = () => {
      containerDiv.style.backgroundColor = bgCb.checked ? bgColor : 'transparent';
    };

    // Add layer checkboxes for each SVG element
    svgElems.forEach((svgElem, i) => {
      const label = document.createElement('label');
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.gap = '4px';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = true;
      cb.dataset.layer = i.toString();
      layerCheckboxes.push(cb);

      cb.onchange = () => {
        svgElem.style.display = cb.checked ? '' : 'none';
      };

      // Extract color from the SVG path
      const path = svgElem.querySelector('path');
      const color = path ? path.getAttribute('fill') : '#888';

      const colorSwatch = document.createElement('span');
      colorSwatch.style.display = 'inline-block';
      colorSwatch.style.width = '16px';
      colorSwatch.style.height = '16px';
      colorSwatch.style.background = color || '#888';
      colorSwatch.style.border = '1px solid #888';
      colorSwatch.style.borderRadius = '3px';

      label.appendChild(cb);
      label.appendChild(colorSwatch);
      label.appendChild(document.createTextNode(`Layer ${i + 1}`));

      layerControls.appendChild(label);
      containerDiv.appendChild(svgElem);
    });

    // Add the controls and container to the preview area
    vectorPreviewElement.appendChild(layerControls);
    vectorPreviewElement.appendChild(containerDiv);

    // Create the combined SVG
    const combinedSvg = document.createElement('div');
    combinedSvg.style.display = 'none'; // Hidden by default
    combinedSvg.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        ${combinedPaths.join('\n        ')}
      </svg>
    `;
    vectorPreviewElement.appendChild(combinedSvg);
  }

  /**
   * Download SVG as a file
   */
  private downloadSvgFile(vectorOutput: VectorOutput): void {
    try {
      // Generate SVG content
      const { width, height } = vectorOutput.dimensions;
      let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
`;

      // Add background if needed
      svgContent += `<rect width="100%" height="100%" fill="${vectorOutput.background}" />\n`;

      // Add all visible layers
      vectorOutput.layers.forEach(layer => {
        if (layer.visible) {
          layer.paths.forEach(path => {
            svgContent += `  <path d="${path.d}" fill="${path.fill}" stroke="${path.stroke}" stroke-width="${path.strokeWidth}" />\n`;
          });
        }
      });

      svgContent += '</svg>';

      // Create download link
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'posterized.svg';
      document.body.appendChild(a);
      a.click();

      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('Error downloading SVG:', error);
      alert('Failed to download SVG. See console for details.');
    }
  }

  /**
   * Download all layers as a ZIP file
   */
  private async downloadLayersAsZip(vectorOutput: VectorOutput): Promise<void> {
    try {
      // Check if JSZip is available
      if (typeof JSZip === 'undefined') {
        alert('JSZip library not loaded. Cannot create ZIP file.');
        return;
      }

      const zip = new JSZip();
      const { width, height } = vectorOutput.dimensions;

      // Add background layer
      const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${vectorOutput.background}"/></svg>`;
      zip.file('layer_background.svg', bgSvg);

      // Add each visible layer
      vectorOutput.layers.forEach((layer, i) => {
        if (!layer.visible) return;

        // Create SVG for this layer
        let layerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n`;

        layer.paths.forEach(path => {
          layerSvg += `<path d="${path.d}" fill="${path.fill}" `;
          if (path.stroke) layerSvg += `stroke="${path.stroke}" `;
          if (path.strokeWidth) layerSvg += `stroke-width="${path.strokeWidth}" `;
          layerSvg += '/>\n';
        });

        layerSvg += '</svg>';
        zip.file(`layer_${i + 1}.svg`, layerSvg);
      });

      // Generate and download ZIP
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'posterize_layers.zip';
      document.body.appendChild(a);
      a.click();

      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('Error creating ZIP file:', error);
      alert('Failed to create ZIP file. See console for details.');
    }
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
