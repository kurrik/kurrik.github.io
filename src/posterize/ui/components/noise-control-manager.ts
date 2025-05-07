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
    const header = document.createElement('div');
    header.className = 'control-header';
    header.textContent = 'Noise Removal';
    header.style.fontWeight = 'bold';
    header.style.marginBottom = '10px';
    header.style.marginTop = '15px';
    container.appendChild(header);
    
    // Create noise toggle control group
    const toggleGroup = document.createElement('div');
    toggleGroup.className = 'control-group';
    toggleGroup.style.marginBottom = '10px';
    toggleGroup.style.display = 'flex';
    toggleGroup.style.alignItems = 'center';
    
    // Create noise toggle checkbox
    const noiseEnable = document.createElement('input');
    noiseEnable.type = 'checkbox';
    noiseEnable.id = 'noiseEnable';
    noiseEnable.checked = this.currentState.posterizeSettings.noiseSettings.enabled;
    noiseEnable.style.marginRight = '10px';
    
    // Create noise toggle label
    const toggleLabel = document.createElement('label');
    toggleLabel.htmlFor = 'noiseEnable';
    toggleLabel.textContent = 'Remove Small Regions';
    
    // Assemble toggle group
    toggleGroup.appendChild(noiseEnable);
    toggleGroup.appendChild(toggleLabel);
    container.appendChild(toggleGroup);
    
    // Create noise threshold control group
    const thresholdGroup = document.createElement('div');
    thresholdGroup.className = 'slider-group';
    thresholdGroup.style.marginBottom = '15px';
    
    // Create noise threshold label
    const thresholdLabel = document.createElement('label');
    thresholdLabel.htmlFor = 'noiseThreshold';
    thresholdLabel.textContent = 'Min Region Size: ';
    
    // Create noise threshold value display
    const thresholdValue = document.createElement('span');
    thresholdValue.id = 'noiseThresholdLabel';
    thresholdValue.textContent = this.currentState.posterizeSettings.noiseSettings.minRegionSize.toString();
    thresholdLabel.appendChild(thresholdValue);
    
    // Create noise threshold slider
    const thresholdSlider = document.createElement('input');
    thresholdSlider.type = 'range';
    thresholdSlider.id = 'noiseThreshold';
    thresholdSlider.min = '10';
    thresholdSlider.max = '500';
    thresholdSlider.step = '10';
    thresholdSlider.value = this.currentState.posterizeSettings.noiseSettings.minRegionSize.toString();
    thresholdSlider.disabled = !this.currentState.posterizeSettings.noiseSettings.enabled;
    thresholdSlider.style.width = '100%';
    
    // Assemble threshold group
    thresholdGroup.appendChild(thresholdLabel);
    thresholdGroup.appendChild(document.createElement('br'));
    thresholdGroup.appendChild(thresholdSlider);
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
