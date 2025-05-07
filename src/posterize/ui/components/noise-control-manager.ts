/**
 * Manager for noise removal controls
 */
import { BaseManager } from './base-manager';
import { INoiseControlManager } from '../../types/manager-interfaces';
import { StateManagementService } from '../../application/services/state-management-service';
import { UIControlFactory } from './ui-control-factory';

export class NoiseControlManager extends BaseManager implements INoiseControlManager {
  constructor(stateManagementService: StateManagementService) {
    super(stateManagementService);
  }

  /**
   * Initialize element references and create UI controls
   */
  protected initializeElementReferences(): void {
    // Get container for noise controls
    const noiseControlsContainer = document.getElementById('noiseControlsContainer');
    
    // Initialize elements references
    this.elements = {
      noiseControlsContainer
    };
    
    // Create noise controls
    if (noiseControlsContainer) {
      this.createNoiseControls(noiseControlsContainer);
    }
  }
  
  /**
   * Create noise removal controls
   */
  private createNoiseControls(container: HTMLElement): void {
    // Create header
    const header = UIControlFactory.createSectionHeader('Noise Removal');
    container.appendChild(header);
    
    // Create min region size slider with integrated checkbox for noise removal
    const { group: thresholdGroup, slider: thresholdSlider, checkbox: noiseEnable, valueDisplay: thresholdValue } = 
      UIControlFactory.createSliderWithCheckbox(
        'noiseThreshold',
        'Min Region Size',
        this.currentState.posterizeSettings.noiseSettings.minRegionSize,
        10,
        500,
        this.currentState.posterizeSettings.noiseSettings.enabled,
        10
      );
    thresholdGroup.style.marginBottom = '15px';
    container.appendChild(thresholdGroup);
    
    // Store references
    this.elements.noiseEnable = noiseEnable;
    this.elements.noiseThreshold = thresholdSlider;
    this.elements.noiseThresholdLabel = thresholdValue;
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
