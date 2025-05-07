/**
 * Manager for color controls
 */
import { BaseManager } from './base-manager';
import { IColorControlManager } from '../../types/manager-interfaces';
import { StateManagementService } from '../../application/services/state-management-service';
import { UIControlFactory } from './ui-control-factory';
import { eventDebouncer, debounce } from '../../utils/debounce-utils';

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
    // Create header
    const header = UIControlFactory.createSectionHeader('Color Thresholds');
    container.appendChild(header);
    
    // Create color count slider using the factory
    const { group, slider, valueDisplay } = UIControlFactory.createSliderControl(
      'colorCount',
      'Color Count',
      this.currentState.posterizeSettings.colorCount,
      2,
      8,
      1
    );
    
    // Add to container
    group.className = 'threshold-slider';
    group.style.marginBottom = '12px';
    container.appendChild(group);
    
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
      // Create debounced image process handler with 20ms delay
      const debouncedImageProcess = debounce(() => {
        // Signal that image needs to be reprocessed
        const processImageEvent = new CustomEvent('posterize:processImage');
        document.dispatchEvent(processImageEvent);
      }, 20);
      
      colorCountSlider.addEventListener('input', () => {
        const value = parseInt((colorCountSlider as HTMLInputElement).value, 10);
        (colorCountLabel as HTMLElement).innerText = value.toString();

        // Update settings immediately
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

        // Regenerate threshold controls immediately
        this.renderThresholdControls();

        // Debounce image processing (20ms delay)
        debouncedImageProcess();
        
        // Trigger vector preview update (already debounced globally at 500ms)
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
      const threshold = thresholds[i] || Math.round(255 * (i + 1) / colorCount);
      
      // Create threshold slider using the factory
      const { group, slider, valueDisplay } = UIControlFactory.createSliderControl(
        `threshold${i+1}`,
        `Threshold ${i+1}`,
        threshold,
        1,
        254,
        1
      );
      
      // Create debounced event handlers with different delays
      const debouncedImageProcess = debounce(() => {
        // Signal that image needs to be reprocessed with a short 20ms delay
        const processImageEvent = new CustomEvent('posterize:processImage');
        document.dispatchEvent(processImageEvent);
      }, 20); // Very short delay for responsive UI
      
      // Add event listener
      slider.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const value = parseInt(target.value, 10);
        
        // Update display immediately
        valueDisplay.textContent = value.toString();
        
        // Update state immediately
        this.currentState.posterizeSettings.thresholds[i] = value;
        this.stateManagementService.saveState(this.currentState);
        
        // Debounce the image processing update (20ms)
        debouncedImageProcess();
        
        // Trigger vector preview update (already debounced globally at 500ms)
        const vectorPreviewEvent = new CustomEvent('posterize:generateVectorPreview');
        document.dispatchEvent(vectorPreviewEvent);
      });
      
      // Add to container
      group.className = 'threshold-slider';
      thresholdControls.appendChild(group);
      
      // Store references
      this.elements[`thresholdSlider${i+1}`] = slider;
      this.elements[`thresholdLabel${i+1}`] = valueDisplay;
    }
  }
}
