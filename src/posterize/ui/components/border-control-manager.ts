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
   * Initialize element references and create UI controls
   */
  protected initializeElementReferences(): void {
    // Get container for border controls
    const borderControlsContainer = document.getElementById('borderControlsContainer');
    
    // Initialize elements references
    this.elements = {
      borderControlsContainer
    };
    
    // Create border controls
    if (borderControlsContainer) {
      this.createBorderControls(borderControlsContainer);
    }
  }
  
  /**
   * Create border controls
   */
  private createBorderControls(container: HTMLElement): void {
    // Create header
    const header = document.createElement('div');
    header.className = 'control-header';
    header.textContent = 'Border Settings';
    header.style.fontWeight = 'bold';
    header.style.marginBottom = '10px';
    header.style.marginTop = '15px';
    container.appendChild(header);
    
    // Create border toggle control group
    const toggleGroup = document.createElement('div');
    toggleGroup.className = 'control-group';
    toggleGroup.style.marginBottom = '10px';
    toggleGroup.style.display = 'flex';
    toggleGroup.style.alignItems = 'center';
    
    // Create border toggle checkbox
    const borderToggle = document.createElement('input');
    borderToggle.type = 'checkbox';
    borderToggle.id = 'borderToggle';
    borderToggle.checked = this.currentState.posterizeSettings.borderSettings.enabled;
    borderToggle.style.marginRight = '10px';
    
    // Create border toggle label
    const toggleLabel = document.createElement('label');
    toggleLabel.htmlFor = 'borderToggle';
    toggleLabel.textContent = 'Enable Borders';
    
    // Assemble toggle group
    toggleGroup.appendChild(borderToggle);
    toggleGroup.appendChild(toggleLabel);
    container.appendChild(toggleGroup);
    
    // Create border thickness control group
    const thicknessGroup = document.createElement('div');
    thicknessGroup.className = 'slider-group';
    thicknessGroup.style.marginBottom = '15px';
    
    // Create border thickness label
    const thicknessLabel = document.createElement('label');
    thicknessLabel.htmlFor = 'borderThickness';
    thicknessLabel.textContent = 'Border Thickness: ';
    
    // Create border thickness value display
    const thicknessValue = document.createElement('span');
    thicknessValue.id = 'borderThicknessLabel';
    thicknessValue.textContent = this.currentState.posterizeSettings.borderSettings.thickness.toString();
    thicknessLabel.appendChild(thicknessValue);
    
    // Create border thickness slider
    const thicknessSlider = document.createElement('input');
    thicknessSlider.type = 'range';
    thicknessSlider.id = 'borderThickness';
    thicknessSlider.min = '1';
    thicknessSlider.max = '10';
    thicknessSlider.step = '1';
    thicknessSlider.value = this.currentState.posterizeSettings.borderSettings.thickness.toString();
    thicknessSlider.disabled = !this.currentState.posterizeSettings.borderSettings.enabled;
    thicknessSlider.style.width = '100%';
    
    // Assemble thickness group
    thicknessGroup.appendChild(thicknessLabel);
    thicknessGroup.appendChild(document.createElement('br'));
    thicknessGroup.appendChild(thicknessSlider);
    container.appendChild(thicknessGroup);
    
    // Store references
    this.elements.borderToggle = borderToggle;
    this.elements.borderThicknessSlider = thicknessSlider;
    this.elements.borderThicknessLabel = thicknessValue;
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
