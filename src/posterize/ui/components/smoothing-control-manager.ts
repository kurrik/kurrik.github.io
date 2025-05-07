/**
 * Manager for smoothing controls
 */
import { BaseManager } from './base-manager';
import { ISmoothingControlManager } from '../../types/manager-interfaces';
import { StateManagementService } from '../../application/services/state-management-service';

export class SmoothingControlManager extends BaseManager implements ISmoothingControlManager {
  constructor(stateManagementService: StateManagementService) {
    super(stateManagementService);
  }

  /**
   * Initialize element references
   */
  protected initializeElementReferences(): void {
    this.elements = {
      smoothEnable: document.getElementById('smoothEnable'),
      smoothStrength: document.getElementById('smoothStrength'),
      smoothStrengthLabel: document.getElementById('smoothStrengthLabel')
    };
  }

  /**
   * Bind smoothing control events
   */
  public bindEvents(): void {
    this.bindSmoothControlEvents();
  }

  /**
   * Update smoothing controls based on state
   */
  protected updateControlsInternal(): void {
    const { smoothEnable, smoothStrength, smoothStrengthLabel } = this.elements;
    if (smoothEnable && smoothStrength && smoothStrengthLabel) {
      (smoothEnable as HTMLInputElement).checked = this.currentState.posterizeSettings.smoothSettings.enabled;
      (smoothStrength as HTMLInputElement).value = this.currentState.posterizeSettings.smoothSettings.strength.toString();
      (smoothStrengthLabel as HTMLElement).innerText = this.currentState.posterizeSettings.smoothSettings.strength.toString();
      (smoothStrength as HTMLInputElement).disabled = !this.currentState.posterizeSettings.smoothSettings.enabled;
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
        
        // Signal that image needs to be reprocessed
        const processImageEvent = new CustomEvent('posterize:processImage');
        document.dispatchEvent(processImageEvent);
      });

      smoothStrength.addEventListener('input', () => {
        const value = parseInt((smoothStrength as HTMLInputElement).value, 10);
        (smoothStrengthLabel as HTMLElement).innerText = value.toString();

        this.currentState.posterizeSettings.smoothSettings.strength = value;
        this.stateManagementService.saveState(this.currentState);
        
        if (this.currentState.posterizeSettings.smoothSettings.enabled) {
          // Signal that image needs to be reprocessed
          const processImageEvent = new CustomEvent('posterize:processImage');
          document.dispatchEvent(processImageEvent);
        }
      });
    }
  }
}
