/**
 * UI component for managing SVG layer controls
 */
import {
  ILayerPanelManager,
  VectorOutput,
  VectorLayer
} from '../../types/interfaces';

import { BaseManager } from './base-manager';
import { StateManagementService } from '../../application/services/state-management-service';

export class LayerPanelManager extends BaseManager implements ILayerPanelManager {
  private layerPanel: HTMLElement | null;
  private vectorPreviewContainer: HTMLElement | null;
  private layerCheckboxes: Map<string, HTMLInputElement> = new Map();
  private backgroundCheckbox: HTMLInputElement | null = null;
  private bgColor: string = '#f7f7f7';
  private currentVectorOutput: VectorOutput | null = null;
  private onLayerVisibilityChange: (layerId: string, visible: boolean) => void = () => {};

  constructor(
    stateManagementService: StateManagementService,
    layerPanelContainerId: string = 'vectorPreview',
    vectorPreviewContainerId: string = 'vectorPreviewContainer'
  ) {
    super(stateManagementService);
    this.layerPanel = document.getElementById(layerPanelContainerId);
    this.vectorPreviewContainer = document.getElementById(vectorPreviewContainerId);
  }

  /**
   * Initialize element references needed by this manager
   */
  protected initializeElementReferences(): void {
    this.elements = {
      layerPanel: document.getElementById('vectorPreview'),
      vectorPreviewContainer: document.getElementById('vectorPreviewContainer')
    };
  }

  /**
   * Set layer visibility change callback
   */
  setLayerVisibilityChangeCallback(callback: (layerId: string, visible: boolean) => void): void {
    this.onLayerVisibilityChange = callback;
  }

  /**
   * Create layer controls for vector output
   */
  createLayerControls(vectorOutput: VectorOutput): void {
    if (!this.layerPanel) return;
    this.currentVectorOutput = vectorOutput;
    
    // Clear existing controls
    this.layerPanel.innerHTML = '';
    this.layerCheckboxes.clear();
    this.backgroundCheckbox = null;
    
    // Create control panel container
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
    
    // Set button event handlers
    enableAllBtn.onclick = this.enableAllLayers.bind(this);
    disableAllBtn.onclick = this.disableAllLayers.bind(this);
    
    // Add background layer control
    this.bgColor = vectorOutput.background || '#f7f7f7';
    this.addBackgroundControl(layerControls);
    
    // Add layer controls
    vectorOutput.layers.forEach((layer, index) => {
      this.addLayerControl(layerControls, layer, index);
    });
    
    // Add cross-hatching controls section
    this.addCrossHatchingControls(layerControls);
    
    // Add to layer panel
    this.layerPanel.appendChild(layerControls);
    
    // Create preview stack
    this.createPreviewStack(vectorOutput);
    
    // Show vector preview container
    if (this.vectorPreviewContainer) {
      this.vectorPreviewContainer.style.display = 'flex';
    }
  }

  /**
   * Add background layer control
   */
  private addBackgroundControl(container: HTMLElement): void {
    const bgLabel = document.createElement('label');
    bgLabel.style.display = 'flex';
    bgLabel.style.alignItems = 'center';
    bgLabel.style.gap = '4px';
    
    const bgCb = document.createElement('input');
    bgCb.type = 'checkbox';
    bgCb.checked = true;
    
    const bgSwatch = document.createElement('span');
    bgSwatch.style.display = 'inline-block';
    bgSwatch.style.width = '16px';
    bgSwatch.style.height = '16px';
    bgSwatch.style.background = this.bgColor;
    bgSwatch.style.border = '1px solid #888';
    bgSwatch.style.borderRadius = '3px';
    
    bgLabel.appendChild(bgCb);
    bgLabel.appendChild(bgSwatch);
    bgLabel.appendChild(document.createTextNode('Background'));
    
    container.appendChild(bgLabel);
    
    // Store background checkbox
    this.backgroundCheckbox = bgCb;
    
    // Set event handler
    bgCb.onchange = () => {
      this.updateBackgroundVisibility(bgCb.checked);
    };
  }

  /**
   * Add layer control for a specific vector layer
   */
  private addLayerControl(container: HTMLElement, layer: VectorLayer, index: number): void {
    const label = document.createElement('label');
    label.style.display = 'flex';
    label.style.alignItems = 'center';
    label.style.gap = '4px';
    
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = layer.visible;
    cb.dataset.layer = layer.id;
    
    // Get color from layer path
    let color = '#888';
    if (layer.paths.length > 0) {
      color = layer.paths[0].fill || color;
    }
    
    const colorSwatch = document.createElement('span');
    colorSwatch.style.display = 'inline-block';
    colorSwatch.style.width = '16px';
    colorSwatch.style.height = '16px';
    colorSwatch.style.background = color;
    colorSwatch.style.border = '1px solid #888';
    colorSwatch.style.borderRadius = '3px';
    
    label.appendChild(cb);
    label.appendChild(colorSwatch);
    label.appendChild(document.createTextNode(`Layer ${index + 1}`));
    
    container.appendChild(label);
    
    // Store checkbox
    this.layerCheckboxes.set(layer.id, cb);
    
    // Set event handler
    cb.onchange = () => {
      this.updateLayerVisibility(layer.id, cb.checked);
    };
  }

  /**
   * Add cross-hatching controls section
   */
  private addCrossHatchingControls(container: HTMLElement): void {
    // Create a container for cross-hatching controls
    const crossHatchingContainer = document.createElement('div');
    crossHatchingContainer.style.width = '100%';
    crossHatchingContainer.style.marginTop = '10px';
    crossHatchingContainer.style.borderTop = '1px solid #ddd';
    crossHatchingContainer.style.paddingTop = '10px';
    
    // Create header
    const header = document.createElement('h4');
    header.textContent = 'Cross-Hatching for Pen Plotter';
    header.style.margin = '0 0 8px 0';
    header.style.fontSize = '14px';
    crossHatchingContainer.appendChild(header);
    
    // Create toggle control
    const toggleLabel = document.createElement('label');
    toggleLabel.style.display = 'flex';
    toggleLabel.style.alignItems = 'center';
    toggleLabel.style.gap = '4px';
    
    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.id = 'crossHatchingToggle';
    
    toggleLabel.appendChild(toggle);
    toggleLabel.appendChild(document.createTextNode('Enable Cross-Hatching'));
    crossHatchingContainer.appendChild(toggleLabel);
    
    // Create density control
    const densityContainer = document.createElement('div');
    densityContainer.style.display = 'flex';
    densityContainer.style.alignItems = 'center';
    densityContainer.style.gap = '8px';
    densityContainer.style.margin = '8px 0';
    
    const densityLabel = document.createElement('label');
    densityLabel.htmlFor = 'crossHatchingDensity';
    densityLabel.textContent = 'Density:';
    densityLabel.style.minWidth = '60px';
    
    const densitySlider = document.createElement('input');
    densitySlider.type = 'range';
    densitySlider.id = 'crossHatchingDensity';
    densitySlider.min = '1';
    densitySlider.max = '10';
    densitySlider.value = '5';
    densitySlider.disabled = !toggle.checked;
    
    const densityValue = document.createElement('span');
    densityValue.id = 'crossHatchingDensityLabel';
    densityValue.textContent = '5';
    
    densityContainer.appendChild(densityLabel);
    densityContainer.appendChild(densitySlider);
    densityContainer.appendChild(densityValue);
    crossHatchingContainer.appendChild(densityContainer);
    
    // Create angle control
    const angleContainer = document.createElement('div');
    angleContainer.style.display = 'flex';
    angleContainer.style.alignItems = 'center';
    angleContainer.style.gap = '8px';
    angleContainer.style.margin = '8px 0';
    
    const angleLabel = document.createElement('label');
    angleLabel.htmlFor = 'crossHatchingAngle';
    angleLabel.textContent = 'Angle:';
    angleLabel.style.minWidth = '60px';
    
    const angleSlider = document.createElement('input');
    angleSlider.type = 'range';
    angleSlider.id = 'crossHatchingAngle';
    angleSlider.min = '0';
    angleSlider.max = '180';
    angleSlider.value = '45';
    angleSlider.disabled = !toggle.checked;
    
    const angleValue = document.createElement('span');
    angleValue.id = 'crossHatchingAngleLabel';
    angleValue.textContent = '45°';
    
    angleContainer.appendChild(angleLabel);
    angleContainer.appendChild(angleSlider);
    angleContainer.appendChild(angleValue);
    crossHatchingContainer.appendChild(angleContainer);
    
    // Add event listeners
    toggle.addEventListener('change', () => {
      densitySlider.disabled = !toggle.checked;
      angleSlider.disabled = !toggle.checked;
      
      // Trigger cross-hatching generation - this would be handled by the callback
      // in a real implementation
      if (toggle.checked) {
        alert('Cross-hatching feature will be implemented in the next phase');
      }
    });
    
    densitySlider.addEventListener('input', () => {
      densityValue.textContent = densitySlider.value;
    });
    
    angleSlider.addEventListener('input', () => {
      angleValue.textContent = `${angleSlider.value}°`;
    });
    
    // Add to main container
    container.appendChild(crossHatchingContainer);
  }

  /**
   * Create the preview stack for displaying layers
   */
  private createPreviewStack(vectorOutput: VectorOutput): void {
    if (!this.layerPanel || !this.currentVectorOutput) return;
    
    // Check if preview stack already exists
    let previewStack = this.layerPanel.querySelector('.preview-stack') as HTMLElement | null;
    if (previewStack) {
      previewStack.remove();
    }
    
    // Create new preview stack
    previewStack = document.createElement('div') as HTMLElement;
    previewStack.className = 'preview-stack';
    previewStack.style.position = 'relative';
    previewStack.style.width = `${vectorOutput.dimensions.width}px`;
    previewStack.style.height = `${vectorOutput.dimensions.height}px`;
    previewStack.style.margin = '0 auto';
    previewStack.style.aspectRatio = (
      vectorOutput.dimensions.width / vectorOutput.dimensions.height
    ).toFixed(4);
    
    // Add background layer
    const bgDiv = document.createElement('div');
    bgDiv.className = 'bg-layer';
    bgDiv.style.position = 'absolute';
    bgDiv.style.left = '0';
    bgDiv.style.top = '0';
    bgDiv.style.width = '100%';
    bgDiv.style.height = '100%';
    bgDiv.style.background = this.bgColor;
    bgDiv.style.zIndex = '0';
    
    previewStack.appendChild(bgDiv);
    
    // Add each layer as an SVG
    vectorOutput.layers.forEach((layer, index) => {
      const svgNS = 'http://www.w3.org/2000/svg';
      const svgElem = document.createElementNS(svgNS, 'svg');
      
      svgElem.setAttribute('width', vectorOutput.dimensions.width.toString());
      svgElem.setAttribute('height', vectorOutput.dimensions.height.toString());
      svgElem.setAttribute('viewBox', `0 0 ${vectorOutput.dimensions.width} ${vectorOutput.dimensions.height}`);
      svgElem.style.position = 'absolute';
      svgElem.style.left = '0';
      svgElem.style.top = '0';
      svgElem.style.width = '100%';
      svgElem.style.height = '100%';
      svgElem.style.pointerEvents = 'none';
      svgElem.style.zIndex = (index + 1).toString();
      svgElem.dataset.layerId = layer.id;
      svgElem.style.display = layer.visible ? '' : 'none';
      
      // Add each path to the SVG
      layer.paths.forEach(path => {
        const pathElem = document.createElementNS(svgNS, 'path');
        pathElem.setAttribute('d', path.d);
        pathElem.setAttribute('fill', path.fill);
        pathElem.setAttribute('stroke', path.stroke);
        pathElem.setAttribute('stroke-width', path.strokeWidth);
        svgElem.appendChild(pathElem);
      });
      
      previewStack.appendChild(svgElem);
    });
    
    this.layerPanel.appendChild(previewStack);
  }

  /**
   * Update layer visibility
   */
  updateLayerVisibility(layerId: string, visible: boolean): void {
    // Update SVG element visibility
    if (this.layerPanel) {
      const svgElem = this.layerPanel.querySelector(`svg[data-layer-id="${layerId}"]`) as SVGElement;
      if (svgElem) {
        svgElem.style.display = visible ? '' : 'none';
      }
    }
    
    // Call visibility change callback
    this.onLayerVisibilityChange(layerId, visible);
  }

  /**
   * Update background visibility
   */
  private updateBackgroundVisibility(visible: boolean): void {
    // Update background div visibility
    if (this.layerPanel) {
      const bgDiv = this.layerPanel.querySelector('.bg-layer') as HTMLElement;
      if (bgDiv) {
        bgDiv.style.display = visible ? '' : 'none';
      }
    }
  }

  /**
   * Enable all layers
   */
  private enableAllLayers(): void {
    // Enable background
    if (this.backgroundCheckbox) {
      this.backgroundCheckbox.checked = true;
      this.updateBackgroundVisibility(true);
    }
    
    // Enable all layers
    this.layerCheckboxes.forEach((cb, layerId) => {
      cb.checked = true;
      this.updateLayerVisibility(layerId, true);
    });
  }

  /**
   * Disable all layers
   */
  private disableAllLayers(): void {
    // Disable background
    if (this.backgroundCheckbox) {
      this.backgroundCheckbox.checked = false;
      this.updateBackgroundVisibility(false);
    }
    
    // Disable all layers
    this.layerCheckboxes.forEach((cb, layerId) => {
      cb.checked = false;
      this.updateLayerVisibility(layerId, false);
    });
  }

  // Satisfy BaseManager contract
  public bindEvents(): void {
    // No-op: LayerPanelManager does not have bindable events at this level
  }

  protected updateControlsInternal(): void {
    // No-op: LayerPanelManager does not have internal controls to update
  }
}
