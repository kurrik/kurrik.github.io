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
   * Initialize element references
   */
  protected initializeElementReferences(): void {
    this.elements = {
      colorCountSlider: document.getElementById('colorCount'),
      colorCountLabel: document.getElementById('colorCountLabel'),
      thresholdControls: document.getElementById('thresholdControls')
    };
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
      });
    }
  }

  /**
   * Render threshold control sliders
   */
  public renderThresholdControls(): void {
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
        
        // Signal that image needs to be reprocessed
        const processImageEvent = new CustomEvent('posterize:processImage');
        document.dispatchEvent(processImageEvent);
      });

      // Add elements to group
      group.appendChild(label);
      group.appendChild(slider);
      group.appendChild(value);

      // Add group to controls
      thresholdControls.appendChild(group);
    }
  }
}
