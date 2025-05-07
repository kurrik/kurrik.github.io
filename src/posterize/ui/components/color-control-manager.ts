/**
 * Manager for color controls
 */
import { BaseManager } from './base-manager';
import { IColorControlManager } from '../../types/manager-interfaces';
import { StateManagementService } from '../../application/services/state-management-service';

export class ColorControlManager extends BaseManager implements IColorControlManager {
  constructor(stateManagementService: StateManagementService) {
    super(stateManagementService);
  }

  /**
   * Initialize element references and create UI controls
   */
  protected initializeElementReferences(): void {
    // Get containers
    const colorControlsContainer = document.getElementById('colorControlsContainer');
    const thresholdControlsContainer = document.getElementById('thresholdControlsContainer');
    
    // Initialize elements references
    this.elements = {
      colorControlsContainer,
      thresholdControlsContainer
    };
    
    // Create color count control
    if (colorControlsContainer) {
      this.createColorCountControl(colorControlsContainer);
    }
  }

  /**
   * Bind color control events
   */
  public bindEvents(): void {
    this.bindColorControlEvents();
  }

  /**
   * Update color controls
   */
  protected updateControlsInternal(): void {
    const { colorCountSlider, colorCountLabel } = this.elements;
    if (colorCountSlider && colorCountLabel) {
      (colorCountSlider as HTMLInputElement).value = this.currentState.posterizeSettings.colorCount.toString();
      (colorCountLabel as HTMLElement).innerText = this.currentState.posterizeSettings.colorCount.toString();
    }

    // Update threshold controls
    this.renderThresholdControls();
  }

  /**
   * Create color count control
   */
  private createColorCountControl(container: HTMLElement): void {
    // Create container
    const controlGroup = document.createElement('div');
    controlGroup.className = 'slider-group';
    controlGroup.style.marginBottom = '15px';
    
    // Create label
    const label = document.createElement('label');
    label.htmlFor = 'colorCount';
    label.textContent = 'Color Count: ';
    
    // Create value display
    const valueDisplay = document.createElement('span');
    valueDisplay.id = 'colorCountLabel';
    valueDisplay.textContent = this.currentState.posterizeSettings.colorCount.toString();
    label.appendChild(valueDisplay);
    
    // Create slider
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = 'colorCount';
    slider.min = '2';
    slider.max = '8';
    slider.step = '1';
    slider.value = this.currentState.posterizeSettings.colorCount.toString();
    
    // Assemble
    controlGroup.appendChild(label);
    controlGroup.appendChild(slider);
    container.appendChild(controlGroup);
    
    // Store references
    this.elements.colorCountSlider = slider;
    this.elements.colorCountLabel = valueDisplay;
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
        // Cast to PosterizeSettingsModel to access the updateColorCount method
        const settings = this.currentState.posterizeSettings as any;
        if (typeof settings.updateColorCount === 'function') {
          settings.updateColorCount(value);
        } else {
          // Fallback if updateColorCount is not available
          this.currentState.posterizeSettings.colorCount = value;
          this.currentState.posterizeSettings.thresholds = Array.from(
            { length: value - 1 },
            (_, i) => Math.round(255 * (i + 1) / value)
          );
        }
        this.stateManagementService.saveState(this.currentState);

        // Regenerate threshold controls
        this.renderThresholdControls();

        // Signal that image needs to be reprocessed
        const processImageEvent = new CustomEvent('posterize:processImage');
        document.dispatchEvent(processImageEvent);
        
        // Also trigger vector preview update
        const vectorPreviewEvent = new CustomEvent('posterize:generateVectorPreview');
        document.dispatchEvent(vectorPreviewEvent);
      });
    }
  }

  /**
   * Render threshold control sliders
   */
  public renderThresholdControls(): void {
    const { thresholdControlsContainer } = this.elements;
    if (!thresholdControlsContainer) return;

    // Clear existing controls
    thresholdControlsContainer.innerHTML = '';

    // Create header
    const header = document.createElement('div');
    header.className = 'control-header';
    header.textContent = 'Color Thresholds';
    header.style.fontWeight = 'bold';
    header.style.marginBottom = '10px';
    thresholdControlsContainer.appendChild(header);
    
    // Create container for threshold sliders
    const thresholdControls = document.createElement('div');
    thresholdControls.id = 'thresholdControls';
    thresholdControlsContainer.appendChild(thresholdControls);
    
    // Store reference to threshold controls
    this.elements.thresholdControls = thresholdControls;
    
    // Get current settings
    const { colorCount, thresholds } = this.currentState.posterizeSettings;

    // Create sliders for each threshold
    for (let i = 0; i < colorCount - 1; i++) {
      const group = document.createElement('div');
      group.className = 'threshold-slider';
      group.style.marginBottom = '10px';

      const label = document.createElement('label');
      label.innerText = `Threshold ${i + 1}: `;

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '0';
      slider.max = '255';
      slider.value = thresholds[i].toString();
      slider.step = '1';
      slider.style.width = '100%';

      const value = document.createElement('span');
      value.innerText = slider.value;
      value.style.marginLeft = '5px';

      // Add event listener
      slider.addEventListener('input', () => {
        const val = parseInt(slider.value, 10);
        value.innerText = val.toString();

        // Update threshold value
        this.currentState.posterizeSettings.thresholds[i] = val;
        this.stateManagementService.saveState(this.currentState);
        
        // Signal that image needs to be reprocessed
        const processImageEvent = new CustomEvent('posterize:processImage');
        document.dispatchEvent(processImageEvent);
        
        // Also trigger vector preview update
        const vectorPreviewEvent = new CustomEvent('posterize:generateVectorPreview');
        document.dispatchEvent(vectorPreviewEvent);
      });

      // Add elements to group
      group.appendChild(label);
      group.appendChild(value);
      group.appendChild(document.createElement('br'));
      group.appendChild(slider);

      // Add group to controls
      thresholdControls.appendChild(group);
    }
  }
}
