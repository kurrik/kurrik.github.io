/**
 * Manager for border controls
 */
import { BaseManager } from './base-manager';
import { IBorderControlManager } from '../../types/manager-interfaces';
import { StateManagementService } from '../../application/services/state-management-service';
import { UIControlFactory } from './ui-control-factory';

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
    const header = UIControlFactory.createSectionHeader('Border Settings');
    container.appendChild(header);
    
    // Create border thickness slider with integrated checkbox
    const { group: thicknessGroup, slider: thicknessSlider, checkbox: borderToggle, valueDisplay: thicknessValue } = 
      UIControlFactory.createSliderWithCheckbox(
        'borderThickness',
        'Border Thickness',
        this.currentState.posterizeSettings.borderSettings.thickness,
        1,
        10,
        this.currentState.posterizeSettings.borderSettings.enabled,
        1
      );
    thicknessGroup.style.marginBottom = '15px';
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
