/**
 * Manager for vector preview functionality
 */
import { BaseManager } from './base-manager';
import { IVectorControlManager } from '../../types/manager-interfaces';
import {
  VectorOutput,
  VectorLayer,
  VectorPathData,
  StrategyType,
  AppState,
  VectorSettings
} from '../../types/interfaces';
import { VectorConversionService } from '../../domain/services/vector-conversion-service';
import { StateManagementService } from '../../application/services/state-management-service';
import { ImageProcessingService } from '../../application/services/image-processing-service';
import { ImageManager } from './image-manager';

/**
 * Manager for vector preview functionality
 * Handles automatic SVG preview updates and strategy selection
 */
export class VectorControlManager extends BaseManager implements IVectorControlManager {
  private imageProcessingService: ImageProcessingService;
  private imageManager: ImageManager;
  private vectorConversionService: VectorConversionService;
  private debounceTimer: number | null = null;
  private debounceDelay: number = 500; // ms
  private lastVectorOutput: VectorOutput | null = null; // Store the last vector output for layer visibility toggling
  protected elements: Record<string, HTMLElement | null> = {};

  constructor(
    imageProcessingService: ImageProcessingService,
    stateManagementService: StateManagementService,
    imageManager: ImageManager,
    vectorConversionService: VectorConversionService
  ) {
    super(stateManagementService);
    this.imageProcessingService = imageProcessingService;
    this.imageManager = imageManager;
    this.vectorConversionService = vectorConversionService;
  }

  /**
   * Initialize element references
   */
  protected initializeElementReferences(): void {
    // Get container elements
    const strategyControlsContainer = document.getElementById('strategyControlsContainer');
    const vectorPreviewContainer = document.getElementById('vectorPreviewContainer');
    const vectorPreview = document.getElementById('vectorPreview');
    const stencilControls = document.getElementById('stencilControls');
    const penDrawingControls = document.getElementById('penDrawingControls');
    const layerControls = document.getElementById('layerControls');
    const actionButtonsContainer = document.getElementById('actionButtonsContainer');

    // Initialize storage for dynamically created controls
    this.elements = {
      vectorPreviewContainer,
      vectorPreview,
      stencilControls,
      penDrawingControls,
      layerControls,
      actionButtonsContainer,
      strategyControlsContainer
    };

    // Create strategy selector
    if (strategyControlsContainer) {
      this.createStrategySelector(strategyControlsContainer);
    }

    // Create stencil controls
    if (stencilControls) {
      this.createStencilControls(stencilControls);
    }

    // Create pen drawing controls
    if (penDrawingControls) {
      this.createPenDrawingControls(penDrawingControls);
    }

    // Create layer control buttons
    if (layerControls) {
      this.createLayerControlButtons(layerControls);
    }
  }

  /**
   * Create the strategy selector dropdown
   */
  private createStrategySelector(container: HTMLElement): void {
    // Create container
    const selectorContainer = document.createElement('div');
    selectorContainer.className = 'slider-group';
    selectorContainer.style.display = 'flex';
    selectorContainer.style.alignItems = 'center';
    selectorContainer.style.marginBottom = '12px';
    selectorContainer.style.width = '100%';
    selectorContainer.style.maxWidth = '340px';

    // Create label
    const label = document.createElement('label');
    label.htmlFor = 'strategySelector';
    label.textContent = 'SVG Style:';
    label.style.minWidth = '80px';

    // Create dropdown
    const select = document.createElement('select');
    select.id = 'strategySelector';

    // Add options
    const stencilOption = document.createElement('option');
    stencilOption.value = StrategyType.STENCIL;
    stencilOption.textContent = 'Stencil (Filled Regions)';

    const penDrawingOption = document.createElement('option');
    penDrawingOption.value = StrategyType.PEN_DRAWING;
    penDrawingOption.textContent = 'Pen Drawing (Outlines)';

    select.appendChild(stencilOption);
    select.appendChild(penDrawingOption);

    // Assemble and add to container
    selectorContainer.appendChild(label);
    selectorContainer.appendChild(select);
    container.appendChild(selectorContainer);

    // Store reference
    this.elements.strategySelector = select;
  }

  /**
   * Create stencil-specific controls
   */
  private createStencilControls(container: HTMLElement): void {
    // Create bezier curve control
    const bezierContainer = document.createElement('div');
    bezierContainer.className = 'slider-group';
    bezierContainer.style.display = 'flex';
    bezierContainer.style.flexWrap = 'wrap';
    bezierContainer.style.alignItems = 'center';
    bezierContainer.style.width = '100%';
    bezierContainer.style.maxWidth = '340px';
    bezierContainer.style.margin = '0 auto 10px auto';

    // Label
    const label = document.createElement('label');
    label.id = 'bezierSliderLabel';
    label.htmlFor = 'bezierSlider';
    label.textContent = 'Curve Fit:';
    label.style.minWidth = '80px';

    // Slider
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = 'bezierSlider';
    slider.min = '0';
    slider.max = '10';
    slider.value = '3';

    // Value display
    const valueDisplay = document.createElement('span');
    valueDisplay.id = 'bezierSliderValue';
    valueDisplay.textContent = '3';
    valueDisplay.style.marginLeft = '8px';

    // Assemble
    bezierContainer.appendChild(label);
    bezierContainer.appendChild(slider);
    bezierContainer.appendChild(valueDisplay);
    container.appendChild(bezierContainer);

    // Store references
    this.elements.bezierSlider = slider;
    this.elements.bezierSliderValue = valueDisplay;
  }

  /**
   * Create pen drawing controls (cross-hatching)
   */
  private createPenDrawingControls(container: HTMLElement): void {
    container.style.maxWidth = '340px';
    container.style.width = '100%';
    container.style.margin = '0 auto 16px auto';
    container.style.borderTop = '1px solid #eee';
    container.style.paddingTop = '12px';

    // Header
    const header = document.createElement('div');
    header.style.marginBottom = '8px';
    header.style.fontWeight = 'bold';
    header.style.color = '#059669';
    header.textContent = 'Pen Plotter Settings';
    container.appendChild(header);

    // Cross-hatching toggle
    const toggleContainer = document.createElement('label');
    toggleContainer.style.display = 'flex';
    toggleContainer.style.alignItems = 'center';
    toggleContainer.style.gap = '4px';
    toggleContainer.style.marginBottom = '8px';

    const toggleCheckbox = document.createElement('input');
    toggleCheckbox.type = 'checkbox';
    toggleCheckbox.id = 'crossHatchingToggle';

    const toggleLabel = document.createElement('span');
    toggleLabel.textContent = 'Use Cross-Hatching for Tones';

    toggleContainer.appendChild(toggleCheckbox);
    toggleContainer.appendChild(toggleLabel);
    container.appendChild(toggleContainer);

    // Cross-hatching density
    const densityContainer = document.createElement('div');
    densityContainer.style.display = 'flex';
    densityContainer.style.alignItems = 'center';
    densityContainer.style.marginBottom = '6px';

    const densityLabel = document.createElement('label');
    densityLabel.htmlFor = 'crossHatchingDensity';
    densityLabel.style.minWidth = '70px';
    densityLabel.textContent = 'Density:';

    const densitySlider = document.createElement('input');
    densitySlider.type = 'range';
    densitySlider.id = 'crossHatchingDensity';
    densitySlider.min = '1';
    densitySlider.max = '10';
    densitySlider.value = '5';
    densitySlider.disabled = true; // Initially disabled

    const densityValue = document.createElement('span');
    densityValue.id = 'crossHatchingDensityLabel';
    densityValue.textContent = '5';
    densityValue.style.marginLeft = '6px';

    densityContainer.appendChild(densityLabel);
    densityContainer.appendChild(densitySlider);
    densityContainer.appendChild(densityValue);
    container.appendChild(densityContainer);

    // Cross-hatching angle
    const angleContainer = document.createElement('div');
    angleContainer.style.display = 'flex';
    angleContainer.style.alignItems = 'center';

    const angleLabel = document.createElement('label');
    angleLabel.htmlFor = 'crossHatchingAngle';
    angleLabel.style.minWidth = '70px';
    angleLabel.textContent = 'Angle:';

    const angleSlider = document.createElement('input');
    angleSlider.type = 'range';
    angleSlider.id = 'crossHatchingAngle';
    angleSlider.min = '0';
    angleSlider.max = '180';
    angleSlider.value = '45';
    angleSlider.disabled = true; // Initially disabled

    const angleValue = document.createElement('span');
    angleValue.id = 'crossHatchingAngleLabel';
    angleValue.textContent = '45°';
    angleValue.style.marginLeft = '6px';

    angleContainer.appendChild(angleLabel);
    angleContainer.appendChild(angleSlider);
    angleContainer.appendChild(angleValue);
    container.appendChild(angleContainer);

    // Store references
    this.elements.crossHatchingToggle = toggleCheckbox;
    this.elements.crossHatchingDensity = densitySlider;
    this.elements.crossHatchingDensityLabel = densityValue;
    this.elements.crossHatchingAngle = angleSlider;
    this.elements.crossHatchingAngleLabel = angleValue;
  }

  /**
   * Create layer control buttons
   */
  private createLayerControlButtons(container: HTMLElement): void {
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '8px';
    buttonContainer.style.marginTop = '8px';

    // Enable all layers button
    const enableAllBtn = document.createElement('button');
    enableAllBtn.id = 'enableAllLayers';
    enableAllBtn.textContent = 'Show All Layers';
    enableAllBtn.className = 'small-btn';

    // Disable all layers button
    const disableAllBtn = document.createElement('button');
    disableAllBtn.id = 'disableAllLayers';
    disableAllBtn.textContent = 'Hide All Layers';
    disableAllBtn.className = 'small-btn';

    buttonContainer.appendChild(enableAllBtn);
    buttonContainer.appendChild(disableAllBtn);
    container.appendChild(buttonContainer);

    // Layers container
    const layersListContainer = document.createElement('div');
    layersListContainer.className = 'layer-controls';
    layersListContainer.style.marginTop = '8px';
    container.appendChild(layersListContainer);

    // Store references
    this.elements.enableAllLayersBtn = enableAllBtn;
    this.elements.disableAllLayersBtn = disableAllBtn;
    this.elements.layersList = layersListContainer;
  }

  // Export button creation has been moved to ExportManager for better separation of concerns

  /**
   * Bind vector control events
   */
  public bindEvents(): void {
    // Add strategy selector if it doesn't exist yet
    this.ensureStrategySelector();

    const {
      strategySelector,
      enableAllLayersBtn,
      disableAllLayersBtn
    } = this.elements;

    // Bind strategy selector change event
    if (strategySelector) {
      strategySelector.addEventListener('change', () => {
        const selectedStrategy = (strategySelector as HTMLSelectElement).value as StrategyType;
        this.setVectorStrategy(selectedStrategy);
      });
    }

    // Enable all layers button
    if (enableAllLayersBtn) {
      enableAllLayersBtn.addEventListener('click', () => {
        this.setAllLayersVisibility(true);
      });
    }

    // Disable all layers button
    if (disableAllLayersBtn) {
      disableAllLayersBtn.addEventListener('click', () => {
        this.setAllLayersVisibility(false);
      });
    }

    // Bind all control events that should trigger preview updates
    this.bindControlUpdateEvents();

    // Initially show the SVG preview with the current settings
    this.updatePreview();
  }

  /**
   * Ensure that the strategy selector exists
   * Create it if it's not in the HTML already
   */
  private ensureStrategySelector(): void {
    const { vectorPreviewContainer } = this.elements;

    // If the strategy selector doesn't exist, create it
    if (!this.elements.strategySelector && vectorPreviewContainer) {
      // Create strategy selector container
      const selectorContainer = document.createElement('div');
      selectorContainer.className = 'slider-group';
      selectorContainer.style.display = 'flex';
      selectorContainer.style.alignItems = 'center';
      selectorContainer.style.marginBottom = '12px';
      selectorContainer.style.width = '100%';

      // Create label
      const label = document.createElement('label');
      label.htmlFor = 'strategySelector';
      label.textContent = 'SVG Style:';
      label.style.minWidth = '80px';

      // Create select element
      const select = document.createElement('select');
      select.id = 'strategySelector';

      // Add options for each strategy
      const stencilOption = document.createElement('option');
      stencilOption.value = StrategyType.STENCIL;
      stencilOption.textContent = 'Stencil (Filled Regions)';

      const penDrawingOption = document.createElement('option');
      penDrawingOption.value = StrategyType.PEN_DRAWING;
      penDrawingOption.textContent = 'Pen Drawing (Outlines)';

      // Add options to select
      select.appendChild(stencilOption);
      select.appendChild(penDrawingOption);

      // Add elements to container
      selectorContainer.appendChild(label);
      selectorContainer.appendChild(select);

      // Add container to the DOM at the top of the vector preview container
      const firstChild = vectorPreviewContainer.firstChild;
      if (firstChild) {
        vectorPreviewContainer.insertBefore(selectorContainer, firstChild);
      } else {
        vectorPreviewContainer.appendChild(selectorContainer);
      }

      // Update element reference
      this.elements.strategySelector = select;
    }
  }

  /**
   * Bind events to controls that should trigger preview updates
   */
  private bindControlUpdateEvents(): void {
    const {
      crossHatchingToggle,
      crossHatchingDensity,
      crossHatchingAngle
    } = this.elements;

    // Monitor all controls that should trigger a preview update
    const updatePreviewOnChange = (element: HTMLElement | null, eventType: string, handler: (e: Event) => void) => {
      if (element) {
        const wrappedHandler = (e: Event) => {
          handler(e);
          this.debouncedUpdatePreview(); // Update preview after change
        };
        element.addEventListener(eventType, wrappedHandler);
      }
    };

    // Cross-hatching toggle
    if (crossHatchingToggle) {
      updatePreviewOnChange(crossHatchingToggle, 'change', () => {
        if (this.currentState.crossHatchingSettings) {
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
        }
      });
    }

    // Cross-hatching density slider
    if (crossHatchingDensity && this.elements.crossHatchingDensityLabel) {
      updatePreviewOnChange(crossHatchingDensity, 'input', () => {
        const value = parseInt((crossHatchingDensity as HTMLInputElement).value, 10);
        if (this.elements.crossHatchingDensityLabel) {
          (this.elements.crossHatchingDensityLabel as HTMLElement).innerText = value.toString();
        }

        if (this.currentState.crossHatchingSettings) {
          this.currentState.crossHatchingSettings.density = value;
          this.stateManagementService.saveState(this.currentState);
        }
      });
    }

    // Cross-hatching angle slider
    if (crossHatchingAngle && this.elements.crossHatchingAngleLabel) {
      updatePreviewOnChange(crossHatchingAngle, 'input', () => {
        const value = parseInt((crossHatchingAngle as HTMLInputElement).value, 10);
        if (this.elements.crossHatchingAngleLabel) {
          (this.elements.crossHatchingAngleLabel as HTMLElement).innerText = value.toString();
        }

        if (this.currentState.crossHatchingSettings) {
          this.currentState.crossHatchingSettings.angle = value;
          this.stateManagementService.saveState(this.currentState);
        }
      });
    }

    // Also bind events for all posterize settings that should trigger an update
    this.bindPosterizeSettingsEvents();
  }

  /**
   * Bind events to posterize settings controls
   */
  private bindPosterizeSettingsEvents(): void {
    // Instead of directly binding to the DOM elements that no longer exist in the HTML,
    // we'll listen for custom events that are triggered when those settings change.
    // This approach makes the components more loosely coupled.
    
    // Listen for processImage events which indicate that posterize settings have changed
    document.addEventListener('posterize:processImage', () => {
      // Update the preview when image processing occurs
      this.debouncedUpdatePreview();
    });
    
    // We could also bind to the bezier curve slider here
    const { bezierSlider } = this.elements;
    if (bezierSlider) {
      bezierSlider.addEventListener('input', () => {
        // The value update is handled in the bezier slider's own event handler
        // Just need to trigger the preview update here
        this.debouncedUpdatePreview();
      });
    }
  }

  /**
   * Set the active vector conversion strategy
   */
  public setVectorStrategy(strategyType: StrategyType): void {
    // Update the service with the new strategy
    this.vectorConversionService.setActiveStrategy(strategyType);

    // Show the contextual controls for this strategy
    this.showContextualControls(strategyType);

    // Update the preview with the new strategy
    this.updatePreview();
  }

  /**
   * Show or hide controls based on the active strategy
   */
  public showContextualControls(strategyType: StrategyType): void {
    const { stencilControls, penDrawingControls } = this.elements;

    // Hide all controls first
    if (stencilControls) stencilControls.style.display = 'none';
    if (penDrawingControls) penDrawingControls.style.display = 'none';

    // Show only controls for the selected strategy
    switch (strategyType) {
      case StrategyType.STENCIL:
        if (stencilControls) stencilControls.style.display = 'block';
        break;

      case StrategyType.PEN_DRAWING:
        if (penDrawingControls) penDrawingControls.style.display = 'block';
        break;

      default:
        console.warn(`Unknown strategy type: ${strategyType}`);
    }
  }

  /**
   * Debounced update preview to prevent too many updates while sliders are being dragged
   */
  private debouncedUpdatePreview(): void {
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = window.setTimeout(() => {
      this.updatePreview();
      this.debounceTimer = null;
    }, this.debounceDelay);
  }

  /**
   * Update the vector preview with current settings
   */
  public updatePreview(): void {
    const currentImageData = this.imageManager.getCurrentImageData();
    if (!currentImageData) {
      console.warn('No image loaded, cannot update preview');
      return;
    }
    
    // Check if the image data actually has valid data
    if (currentImageData.dimensions.width === 0 || currentImageData.dimensions.height === 0) {
      console.warn('Image data not fully loaded yet, deferring preview');
      return;
    }

    try {
      // Process the image with current posterize settings
      const processedResult = this.imageProcessingService.processImage(
        currentImageData,
        this.currentState.posterizeSettings
      );
      
      // Make sure we got valid processed results
      if (!processedResult || !processedResult.processedImageData) {
        console.warn('Image processing did not return valid results');
        return;
      }

      // Generate vector from processed result using the active strategy
      const vectorResult = this.imageProcessingService.generateVector(
        processedResult,
        this.currentState.vectorSettings
      );
      
      // Make sure we have valid vector output
      if (!vectorResult || !vectorResult.vectorOutput || !vectorResult.vectorOutput.layers || vectorResult.vectorOutput.layers.length === 0) {
        console.warn('Vector generation did not return valid results');
        return;
      }

      // Render the vector preview
      this.renderVectorPreview(vectorResult.vectorOutput);

      // Show the vector preview container
      const { vectorPreviewContainer } = this.elements;
      if (vectorPreviewContainer) {
        vectorPreviewContainer.style.display = 'flex';
      }

      // Save the current state
      this.stateManagementService.saveState(this.currentState);
    } catch (error) {
      console.error('Error generating vector preview:', error);
    }
  }

  /**
   * Generate cross-hatched vector preview for backward compatibility
   */
  public generateCrossHatchedPreview(): void {
    // Set the strategy to PEN_DRAWING and update
    this.setVectorStrategy(StrategyType.PEN_DRAWING);

    // Enable cross-hatching
    const { crossHatchingToggle } = this.elements;
    if (crossHatchingToggle && this.currentState.crossHatchingSettings) {
      this.currentState.crossHatchingSettings.enabled = true;
      (crossHatchingToggle as HTMLInputElement).checked = true;

      // Update cross-hatching controls
      const { crossHatchingDensity, crossHatchingAngle } = this.elements;
      if (crossHatchingDensity) {
        (crossHatchingDensity as HTMLInputElement).disabled = false;
      }
      if (crossHatchingAngle) {
        (crossHatchingAngle as HTMLInputElement).disabled = false;
      }

      this.stateManagementService.saveState(this.currentState);
    }

    // Update the preview
    this.updatePreview();
  }

  /**
   * Render vector preview in the UI
   */
  public renderVectorPreview(vectorOutput: VectorOutput): void {
    const { vectorPreview } = this.elements;
    if (!vectorPreview) return;

    // Clear existing content
    vectorPreview.innerHTML = '';

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
        pathElem.setAttribute('stroke-width', path.strokeWidth);
        svgElem.appendChild(pathElem);
      });

      layersDiv.appendChild(svgElem);
    });

    // Add layers div to the preview container
    vectorPreview.appendChild(layersDiv);

    // Create layer controls
    this.createVectorLayerControls(vectorOutput);
  }

  /**
   * Create layer controls for the vector preview
   */
  public createVectorLayerControls(vectorOutput: VectorOutput): void {
    const { layerControls } = this.elements;
    if (!layerControls) return;

    // Clear existing controls
    layerControls.innerHTML = '';
    
    // Store a reference to the current vector output for future updates
    this.lastVectorOutput = vectorOutput;

    // Create layer toggles
    vectorOutput.layers.forEach((layer, i) => {
      const layerDiv = document.createElement('div');
      layerDiv.className = 'layer-control';
      layerDiv.style.display = 'flex';
      layerDiv.style.alignItems = 'center';
      layerDiv.style.marginBottom = '8px';

      // Create color swatch
      const swatch = document.createElement('div');
      swatch.style.width = '20px';
      swatch.style.height = '20px';
      swatch.style.marginRight = '8px';

      // If paths exist, use their color for the swatch
      if (layer.paths && layer.paths.length > 0) {
        swatch.style.backgroundColor = layer.paths[0].fill;
      } else {
        swatch.style.backgroundColor = '#ccc';
      }

      // Create checkbox
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = layer.visible;
      checkbox.id = `layer-toggle-${i}`;
      checkbox.setAttribute('data-layer-id', layer.id);
      checkbox.style.marginRight = '8px';
      
      // Add event listener that properly updates and re-renders the layer
      checkbox.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const isVisible = target.checked;
        const layerId = target.getAttribute('data-layer-id');
        
        if (layerId) {
          // Update the layer visibility in our stored reference
          if (this.lastVectorOutput) {
            const layerToUpdate = this.lastVectorOutput.layers.find((l: { id: string; visible: boolean }) => l.id === layerId);
            if (layerToUpdate) {
              layerToUpdate.visible = isVisible;
              // Re-render with updated visibility
              this.renderVectorPreview(this.lastVectorOutput);
            }
          }
        }
      });

      // Create label
      const label = document.createElement('label');
      label.htmlFor = `layer-toggle-${i}`;
      label.textContent = `Layer ${i + 1}`;

      // Append elements
      layerDiv.appendChild(swatch);
      layerDiv.appendChild(checkbox);
      layerDiv.appendChild(label);
      layerControls.appendChild(layerDiv);
    });
  }

  /**
   * Update the visibility of a layer
   */
  private updateLayerVisibility(layerId: string, visible: boolean): void {
    // Get the current vector output
    const currentOutput = this.getCurrentVectorOutput();
    if (!currentOutput) return;

    // Find the layer and update visibility
    const layer = currentOutput.layers.find(l => l.id === layerId);
    if (layer) {
      layer.visible = visible;

      // Re-render the preview
      this.renderVectorPreview(currentOutput);
    }
  }

  /**
   * Get the current vector output from the preview
   */
  private getCurrentVectorOutput(): VectorOutput | null {
    // Try to use the preview manager if available
    if (window.previewManager && typeof window.previewManager.getVectorOutput === 'function') {
      return window.previewManager.getVectorOutput();
    }

    // Otherwise, we'll need to regenerate it
    try {
      const currentImageData = this.imageManager.getCurrentImageData();
      if (!currentImageData) return null;

      const processedResult = this.imageProcessingService.processImage(
        currentImageData,
        this.currentState.posterizeSettings
      );

      const vectorResult = this.imageProcessingService.generateVector(
        processedResult,
        this.currentState.vectorSettings
      );

      return vectorResult.vectorOutput;
    } catch (error) {
      console.error('Error getting current vector output:', error);
      return null;
    }
  }

  /**
   * Set visibility for all layers
   */
  private setAllLayersVisibility(visible: boolean): void {
    const currentOutput = this.getCurrentVectorOutput();
    if (!currentOutput) return;

    // Update all layers
    currentOutput.layers.forEach(layer => {
      layer.visible = visible;
    });

    // Re-render with updated visibility
    this.renderVectorPreview(currentOutput);
  }

  /**
   * Update controls based on state
   */
  protected updateControlsInternal(): void {
    const { strategySelector, crossHatchingToggle, crossHatchingDensity, crossHatchingAngle } = this.elements;

    // Update strategy selector if it exists
    if (strategySelector) {
      try {
        // Set the current active strategy in the dropdown
        const currentStrategy = this.vectorConversionService.getActiveStrategy().strategyType;
        (strategySelector as HTMLSelectElement).value = currentStrategy;

        // Show the appropriate contextual controls for this strategy
        this.showContextualControls(currentStrategy);
      } catch (e) {
        console.warn('Failed to get active strategy:', e);
        // Default to stencil strategy if there's an error
        this.showContextualControls(StrategyType.STENCIL);
      }
    } else {
      // Create the strategy selector if it doesn't exist
      this.ensureStrategySelector();
    }

    // Update cross-hatching controls
    if (crossHatchingToggle && crossHatchingDensity && crossHatchingAngle && this.currentState.crossHatchingSettings) {
      (crossHatchingToggle as HTMLInputElement).checked = this.currentState.crossHatchingSettings.enabled;
      (crossHatchingDensity as HTMLInputElement).value = this.currentState.crossHatchingSettings.density.toString();
      (crossHatchingAngle as HTMLInputElement).value = this.currentState.crossHatchingSettings.angle.toString();

      (crossHatchingDensity as HTMLInputElement).disabled = !this.currentState.crossHatchingSettings.enabled;
      (crossHatchingAngle as HTMLInputElement).disabled = !this.currentState.crossHatchingSettings.enabled;
    }

    // Show the preview
    this.updatePreview();
  }
}

// Global interfaces for previewManager and layerPanelManager are defined in ui-control-manager.ts
