/**
 * Manager for border controls
 */
import { BaseManager } from './base-manager';
import { IBorderControlManager } from '../../types/manager-interfaces';
import { StateManagementService } from '../../application/services/state-management-service';

export class BorderControlManager extends BaseManager implements IBorderControlManager {
  constructor(stateManagementService: StateManagementService) {
    super(stateManagementService);
  }

  /**
   * Initialize element references
   */
  protected initializeElementReferences(): void {
    this.elements = {
      borderToggle: document.getElementById('borderToggle'),
      borderThicknessSlider: document.getElementById('borderThickness'),
      borderThicknessLabel: document.getElementById('borderThicknessLabel')
    };
  }

  /**
   * Bind border control events
   */
  public bindEvents(): void {
    this.bindBorderControlEvents();
  }

  /**
   * Update border controls based on state
   */
  protected updateControlsInternal(): void {
    const { borderToggle, borderThicknessSlider, borderThicknessLabel } = this.elements;
    if (borderToggle && borderThicknessSlider && borderThicknessLabel) {
      (borderToggle as HTMLInputElement).checked = this.currentState.posterizeSettings.borderSettings.enabled;
      (borderThicknessSlider as HTMLInputElement).value = this.currentState.posterizeSettings.borderSettings.thickness.toString();
      (borderThicknessLabel as HTMLElement).textContent = this.currentState.posterizeSettings.borderSettings.thickness.toString();
      (borderThicknessSlider as HTMLInputElement).disabled = !this.currentState.posterizeSettings.borderSettings.enabled;
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
        
        // Signal that image needs to be reprocessed
        const processImageEvent = new CustomEvent('posterize:processImage');
        document.dispatchEvent(processImageEvent);
      });

      borderThicknessSlider.addEventListener('input', () => {
        const value = parseInt((borderThicknessSlider as HTMLInputElement).value, 10);
        (borderThicknessLabel as HTMLElement).textContent = value.toString();

        this.currentState.posterizeSettings.borderSettings.thickness = value;
        this.stateManagementService.saveState(this.currentState);
        
        // Signal that image needs to be reprocessed
        const processImageEvent = new CustomEvent('posterize:processImage');
        document.dispatchEvent(processImageEvent);
      });
    }
  }
}
