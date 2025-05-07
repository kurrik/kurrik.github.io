/**
 * Manager for vector preview functionality
 */
import { BaseManager } from './base-manager';
import { IVectorControlManager } from '../../types/manager-interfaces';
import { VectorOutput, VectorLayer, VectorPathData } from '../../types/interfaces';
import { StateManagementService } from '../../application/services/state-management-service';
import { ImageProcessingService } from '../../application/services/image-processing-service';
import { ImageManager } from './image-manager';

export class VectorControlManager extends BaseManager implements IVectorControlManager {
  private imageProcessingService: ImageProcessingService;
  private imageManager: ImageManager;

  constructor(
    imageProcessingService: ImageProcessingService,
    stateManagementService: StateManagementService,
    imageManager: ImageManager
  ) {
    super(stateManagementService);
    this.imageProcessingService = imageProcessingService;
    this.imageManager = imageManager;
  }

  /**
   * Initialize element references
   */
  protected initializeElementReferences(): void {
    this.elements = {
      vectorPreviewBtn: document.getElementById('vectorPreviewBtn'),
      crossHatchPreviewBtn: document.getElementById('crossHatchPreviewBtn'), // New button for cross-hatching
      vectorPreviewContainer: document.getElementById('vectorPreviewContainer'),
      vectorPreview: document.getElementById('vectorPreview'),
      
      // Cross-hatching controls
      crossHatchingToggle: document.getElementById('crossHatchingToggle'),
      crossHatchingDensity: document.getElementById('crossHatchingDensity'),
      crossHatchingDensityLabel: document.getElementById('crossHatchingDensityLabel'),
      crossHatchingAngle: document.getElementById('crossHatchingAngle'),
      crossHatchingAngleLabel: document.getElementById('crossHatchingAngleLabel')
    };
  }

  /**
   * Bind vector control events
   */
  public bindEvents(): void {
    const { vectorPreviewBtn, crossHatchPreviewBtn } = this.elements;

    if (vectorPreviewBtn) {
      vectorPreviewBtn.addEventListener('click', () => {
        this.generateVectorPreview();
      });
    }

    if (crossHatchPreviewBtn) {
      crossHatchPreviewBtn.addEventListener('click', () => {
        this.generateCrossHatchedPreview();
      });
    }

    this.bindCrossHatchingControlEvents();
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

    if (crossHatchingToggle) {
      crossHatchingToggle.addEventListener('change', () => {
        this.currentState.crossHatchingSettings.enabled =
          (crossHatchingToggle as HTMLInputElement).checked;

        // Update UI based on cross-hatching state
        if (crossHatchingDensity && crossHatchingAngle) {
          (crossHatchingDensity as HTMLInputElement).disabled =
            !(crossHatchingToggle as HTMLInputElement).checked;
          (crossHatchingAngle as HTMLInputElement).disabled =
            !(crossHatchingToggle as HTMLInputElement).checked;
        }

        this.stateManagementService.saveState(this.currentState);
      });
    }

    if (crossHatchingDensity && crossHatchingDensityLabel) {
      crossHatchingDensity.addEventListener('input', () => {
        const value = parseInt((crossHatchingDensity as HTMLInputElement).value, 10);
        (crossHatchingDensityLabel as HTMLElement).innerText = value.toString();
        
        this.currentState.crossHatchingSettings.density = value;
        this.stateManagementService.saveState(this.currentState);
      });
    }

    if (crossHatchingAngle && crossHatchingAngleLabel) {
      crossHatchingAngle.addEventListener('input', () => {
        const value = parseInt((crossHatchingAngle as HTMLInputElement).value, 10);
        (crossHatchingAngleLabel as HTMLElement).innerText = value.toString();
        
        this.currentState.crossHatchingSettings.angle = value;
        this.stateManagementService.saveState(this.currentState);
      });
    }
  }

  /**
   * Update controls based on state
   */
  protected updateControlsInternal(): void {
    const { crossHatchingToggle, crossHatchingDensity, crossHatchingAngle } = this.elements;
    
    if (crossHatchingToggle && crossHatchingDensity && crossHatchingAngle) {
      (crossHatchingToggle as HTMLInputElement).checked = this.currentState.crossHatchingSettings.enabled;
      (crossHatchingDensity as HTMLInputElement).value = this.currentState.crossHatchingSettings.density.toString();
      (crossHatchingAngle as HTMLInputElement).value = this.currentState.crossHatchingSettings.angle.toString();
      
      (crossHatchingDensity as HTMLInputElement).disabled = !this.currentState.crossHatchingSettings.enabled;
      (crossHatchingAngle as HTMLInputElement).disabled = !this.currentState.crossHatchingSettings.enabled;
    }
  }

  /**
   * Generate standard vector preview
   */
  public generateVectorPreview(): void {
    const currentImageData = this.imageManager.getCurrentImageData();
    if (!currentImageData) {
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
    
    try {
      // Process the image and get the result
      const processedResult = this.imageProcessingService.processImage(
        currentImageData,
        this.currentState.posterizeSettings
      );
      
      // Generate vector from processed result
      const vectorResult = this.imageProcessingService.generateVector(
        processedResult,
        this.currentState.vectorSettings
      );
      
      // Render the vector preview
      this.renderVectorPreview(vectorResult.vectorOutput);
      
      // Save the current state
      this.stateManagementService.saveState(this.currentState);
    } catch (error) {
      console.error('Error generating vector preview:', error);
      alert('Failed to generate vector preview. See console for details.');
    }
  }

  /**
   * Generate cross-hatched vector preview
   */
  public generateCrossHatchedPreview(): void {
    const currentImageData = this.imageManager.getCurrentImageData();
    if (!currentImageData) {
      alert('Please load an image first.');
      return;
    }
    
    try {
      // Process the image and get the result
      const processedResult = this.imageProcessingService.processImage(
        currentImageData,
        this.currentState.posterizeSettings
      );
      
      // Generate vector from processed result
      const vectorResult = this.imageProcessingService.generateVector(
        processedResult,
        this.currentState.vectorSettings
      );
      
      // Apply cross-hatching to the vector output
      const crossHatchedOutput = this.imageProcessingService.applyCrossHatching(
        vectorResult,
        this.currentState.crossHatchingSettings
      );
      
      // Render the cross-hatched vector preview
      this.renderVectorPreview(crossHatchedOutput);
      
      // Save the current state
      this.stateManagementService.saveState(this.currentState);
    } catch (error) {
      console.error('Error generating cross-hatched preview:', error);
      alert('Failed to generate cross-hatched preview. See console for details.');
    }
  }

  /**
   * Render vector preview in the UI
   */
  public renderVectorPreview(vectorOutput: VectorOutput): void {
    // Use the preview manager to render the vector preview if available
    if (window.previewManager && typeof window.previewManager.renderVectorPreview === 'function') {
      window.previewManager.renderVectorPreview(vectorOutput);
    } else {
      // Fallback to direct DOM manipulation
      this.renderVectorPreviewFallback(vectorOutput);
    }
    
    // Try to use the layer panel manager if available
    if (window.layerPanelManager && typeof window.layerPanelManager.createLayerControls === 'function') {
      window.layerPanelManager.createLayerControls(vectorOutput);
    } else {
      // Create layer controls ourselves
      this.createVectorLayerControls(vectorOutput);
    }
    
    // Show vector preview container
    const vectorPreviewContainer = document.getElementById('vectorPreviewContainer');
    if (vectorPreviewContainer) {
      vectorPreviewContainer.style.display = 'flex';
    }
    
    // Show cross-hatching controls if enabled
    const crossHatchingControls = document.getElementById('crossHatchingControls');
    if (crossHatchingControls) {
      crossHatchingControls.style.display = 'block';
    }
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
      svgElem.style.top = '0';
      svgElem.style.left = '0';
      svgElem.style.width = '100%';
      svgElem.style.height = '100%';
      svgElem.style.zIndex = (i + 1).toString();

      layer.paths.forEach(path => {
        const pathElem = document.createElementNS(svgNS, 'path');
        pathElem.setAttribute('d', path.d);
        pathElem.setAttribute('fill', path.fill);
        pathElem.setAttribute('stroke', path.stroke);
        pathElem.setAttribute('stroke-width', path.strokeWidth || '0');
        svgElem.appendChild(pathElem);
      });

      layersDiv.appendChild(svgElem);
    });

    vectorPreviewElement.appendChild(layersDiv);
  }

  /**
   * Helper method to create layer controls for vector preview
   */
  public createVectorLayerControls(vectorOutput: VectorOutput): void {
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
    enableAllBtn.style.marginRight = '8px';

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
    const bgColor = vectorOutput.background || '#f7f7f7';
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

    // Create SVG container with white background
    const containerDiv = document.createElement('div');
    containerDiv.style.position = 'relative';
    containerDiv.style.width = `${vectorOutput.dimensions.width}px`;
    containerDiv.style.height = `${vectorOutput.dimensions.height}px`;
    containerDiv.style.margin = '0 auto';
    containerDiv.style.backgroundColor = bgColor;

    // Create SVG elements for preview
    const svgNS = 'http://www.w3.org/2000/svg';
    const svgElems: SVGElement[] = [];

    // Add each SVG layer
    vectorOutput.layers.forEach((layer, i) => {
      const svgElem = document.createElementNS(svgNS, 'svg');
      svgElem.setAttribute('width', vectorOutput.dimensions.width.toString());
      svgElem.setAttribute('height', vectorOutput.dimensions.height.toString());
      svgElem.setAttribute('viewBox', `0 0 ${vectorOutput.dimensions.width} ${vectorOutput.dimensions.height}`);
      svgElem.style.position = 'absolute';
      svgElem.style.top = '0';
      svgElem.style.left = '0';
      svgElem.style.width = '100%';
      svgElem.style.height = '100%';
      svgElem.style.display = layer.visible ? '' : 'none';

      layer.paths.forEach(path => {
        const pathElem = document.createElementNS(svgNS, 'path');
        pathElem.setAttribute('d', path.d);
        pathElem.setAttribute('fill', path.fill);
        pathElem.setAttribute('stroke', path.stroke);
        pathElem.setAttribute('stroke-width', path.strokeWidth);
        svgElem.appendChild(pathElem);
      });

      containerDiv.appendChild(svgElem);
      svgElems.push(svgElem);

      // Create layer control
      const label = document.createElement('label');
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.gap = '4px';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = layer.visible;
      layerCheckboxes.push(cb);

      cb.onchange = () => {
        svgElem.style.display = cb.checked ? '' : 'none';
        // Update layer visibility in vectorOutput for export
        layer.visible = cb.checked;
      };

      // Extract color from the SVG path
      const path = layer.paths[0];
      const color = path ? path.fill : '#888';

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
    });

    // Background handler
    bgCb.onchange = () => {
      containerDiv.style.backgroundColor = bgCb.checked ? bgColor : 'transparent';
    };

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

    // Add the controls and container to the preview area
    vectorPreviewElement.appendChild(layerControls);
    vectorPreviewElement.appendChild(containerDiv);
  }
}
