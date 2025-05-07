/**
 * Manager for noise removal controls
 */
import { BaseManager } from './base-manager';
import { INoiseControlManager } from '../../types/manager-interfaces';
import { StateManagementService } from '../../application/services/state-management-service';

export class NoiseControlManager extends BaseManager implements INoiseControlManager {
  constructor(stateManagementService: StateManagementService) {
    super(stateManagementService);
  }

  /**
   * Initialize element references
   */
  protected initializeElementReferences(): void {
    this.elements = {
      noiseEnable: document.getElementById('noiseEnable'),
      noiseThreshold: document.getElementById('noiseThreshold'),
      noiseThresholdLabel: document.getElementById('noiseThresholdLabel')
    };
  }

  /**
   * Bind noise control events
   */
  public bindEvents(): void {
    this.bindNoiseControlEvents();
  }

  /**
   * Update noise controls based on state
   */
  protected updateControlsInternal(): void {
    const { noiseEnable, noiseThreshold, noiseThresholdLabel } = this.elements;
    if (noiseEnable && noiseThreshold && noiseThresholdLabel) {
      (noiseEnable as HTMLInputElement).checked = this.currentState.posterizeSettings.noiseSettings.enabled;
      (noiseThreshold as HTMLInputElement).value = this.currentState.posterizeSettings.noiseSettings.minRegionSize.toString();
      (noiseThresholdLabel as HTMLElement).innerText = this.currentState.posterizeSettings.noiseSettings.minRegionSize.toString();
      (noiseThreshold as HTMLInputElement).disabled = !this.currentState.posterizeSettings.noiseSettings.enabled;
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
        
        // Signal that image needs to be reprocessed
        const processImageEvent = new CustomEvent('posterize:processImage');
        document.dispatchEvent(processImageEvent);
      });

      noiseThreshold.addEventListener('input', () => {
        const value = parseInt((noiseThreshold as HTMLInputElement).value, 10);
        (noiseThresholdLabel as HTMLElement).innerText = value.toString();

        this.currentState.posterizeSettings.noiseSettings.minRegionSize = value;
        this.stateManagementService.saveState(this.currentState);
        
        if (this.currentState.posterizeSettings.noiseSettings.enabled) {
          // Signal that image needs to be reprocessed
          const processImageEvent = new CustomEvent('posterize:processImage');
          document.dispatchEvent(processImageEvent);
        }
      });
    }
  }
}
