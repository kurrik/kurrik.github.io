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
   * Initialize element references and create UI controls
   */
  protected initializeElementReferences(): void {
    // Get container for smoothing controls
    const smoothControlsContainer = document.getElementById('smoothControlsContainer');
    
    // Initialize elements references
    this.elements = {
      smoothControlsContainer
    };
    
    // Create smoothing controls
    if (smoothControlsContainer) {
      this.createSmoothingControls(smoothControlsContainer);
    }
  }
  
  /**
   * Create smoothing controls
   */
  private createSmoothingControls(container: HTMLElement): void {
    // Create header
    const header = document.createElement('div');
    header.className = 'control-header';
    header.textContent = 'Curve Smoothing';
    header.style.fontWeight = 'bold';
    header.style.marginBottom = '10px';
    header.style.marginTop = '15px';
    container.appendChild(header);
    
    // Create smoothing toggle control group
    const toggleGroup = document.createElement('div');
    toggleGroup.className = 'control-group';
    toggleGroup.style.marginBottom = '10px';
    toggleGroup.style.display = 'flex';
    toggleGroup.style.alignItems = 'center';
    
    // Create smoothing toggle checkbox
    const smoothEnable = document.createElement('input');
    smoothEnable.type = 'checkbox';
    smoothEnable.id = 'smoothEnable';
    smoothEnable.checked = this.currentState.posterizeSettings.smoothSettings.enabled;
    smoothEnable.style.marginRight = '10px';
    
    // Create smoothing toggle label
    const toggleLabel = document.createElement('label');
    toggleLabel.htmlFor = 'smoothEnable';
    toggleLabel.textContent = 'Enable Curve Smoothing';
    
    // Assemble toggle group
    toggleGroup.appendChild(smoothEnable);
    toggleGroup.appendChild(toggleLabel);
    container.appendChild(toggleGroup);
    
    // Create smoothing strength control group
    const strengthGroup = document.createElement('div');
    strengthGroup.className = 'slider-group';
    strengthGroup.style.marginBottom = '15px';
    
    // Create smoothing strength label
    const strengthLabel = document.createElement('label');
    strengthLabel.htmlFor = 'smoothStrength';
    strengthLabel.textContent = 'Smoothing Strength: ';
    
    // Create smoothing strength value display
    const strengthValue = document.createElement('span');
    strengthValue.id = 'smoothStrengthLabel';
    strengthValue.textContent = this.currentState.posterizeSettings.smoothSettings.strength.toString();
    strengthLabel.appendChild(strengthValue);
    
    // Create smoothing strength slider
    const strengthSlider = document.createElement('input');
    strengthSlider.type = 'range';
    strengthSlider.id = 'smoothStrength';
    strengthSlider.min = '1';
    strengthSlider.max = '10';
    strengthSlider.step = '1';
    strengthSlider.value = this.currentState.posterizeSettings.smoothSettings.strength.toString();
    strengthSlider.disabled = !this.currentState.posterizeSettings.smoothSettings.enabled;
    strengthSlider.style.width = '100%';
    
    // Assemble strength group
    strengthGroup.appendChild(strengthLabel);
    strengthGroup.appendChild(document.createElement('br'));
    strengthGroup.appendChild(strengthSlider);
    container.appendChild(strengthGroup);
    
    // Store references
    this.elements.smoothEnable = smoothEnable;
    this.elements.smoothStrength = strengthSlider;
    this.elements.smoothStrengthLabel = strengthValue;
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
