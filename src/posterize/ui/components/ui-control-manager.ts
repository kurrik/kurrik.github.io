/**
 * Main UI Controller that orchestrates specialized UI managers
 */
import { IUIControlManager, AppState, VectorOutput } from '../../types/interfaces';
import { ImageProcessingService } from '../../application/services/image-processing-service';
import { StateManagementService } from '../../application/services/state-management-service';
import { debounce } from '../../utils/debounce-utils';
import { VectorConversionService } from '../../domain/services/vector-conversion-service';
import { ImageManager } from './image-manager';
import { ColorControlManager } from './color-control-manager';
import { CropControlManager } from './crop-control-manager';
import { BorderControlManager } from './border-control-manager';
import { NoiseControlManager } from './noise-control-manager';
import { SmoothingControlManager } from './smoothing-control-manager';
import { VectorControlManager } from './vector-control-manager';
import { ExportManager } from './export-manager';

// Declare global interfaces for our app components
declare global {
  interface Window {
    previewManager?: {
      renderVectorPreview: (vectorOutput: VectorOutput) => void;
      getVectorOutput: () => VectorOutput | null;
    };
    layerPanelManager?: {
      createLayerControls: (vectorOutput: VectorOutput) => void;
    };
    JSZip?: any; // For the JSZip library
  }
}

export class UIControlManager implements IUIControlManager {
  private stateManagementService: StateManagementService;
  private imageProcessingService: ImageProcessingService;
  private vectorConversionService: VectorConversionService = new VectorConversionService();
  private currentState: AppState;
  
  // Specialized managers
  private imageManager!: ImageManager;
  private colorControlManager!: ColorControlManager;
  private cropControlManager!: CropControlManager;
  private borderControlManager!: BorderControlManager;
  private noiseControlManager!: NoiseControlManager;
  private smoothingControlManager!: SmoothingControlManager;
  private vectorControlManager!: VectorControlManager;
  private exportManager!: ExportManager;
  
  // UI element references for application-level controls
  private elements: {
    [key: string]: HTMLElement | null;
  } = {};

  constructor(
    imageProcessingService: ImageProcessingService,
    stateManagementService: StateManagementService
  ) {
    this.imageProcessingService = imageProcessingService;
    this.stateManagementService = stateManagementService;
    this.currentState = stateManagementService.getDefaultState();
    
    // Create all managers
    this.initializeManagers();
  }

  /**
   * Initialize specialized managers
   */
  private initializeManagers(): void {
    // Create specialized managers
    this.imageManager = new ImageManager(this.imageProcessingService, this.stateManagementService);
    this.colorControlManager = new ColorControlManager(this.stateManagementService);
    this.cropControlManager = new CropControlManager(this.stateManagementService, this.imageManager);
    this.borderControlManager = new BorderControlManager(this.stateManagementService);
    this.noiseControlManager = new NoiseControlManager(this.stateManagementService);
    this.smoothingControlManager = new SmoothingControlManager(this.stateManagementService);
    // Initialize VectorConversionService if it doesn't exist yet
    if (!this.vectorConversionService) {
      this.vectorConversionService = new VectorConversionService();
    }
    this.vectorControlManager = new VectorControlManager(
      this.imageProcessingService, 
      this.stateManagementService, 
      this.imageManager, 
      this.vectorConversionService
    );
    this.exportManager = new ExportManager(this.stateManagementService);
    
    // Initialize all managers
    this.imageManager.initialize();
    this.colorControlManager.initialize();
    this.cropControlManager.initialize();
    this.borderControlManager.initialize();
    this.noiseControlManager.initialize();
    this.smoothingControlManager.initialize();
    this.vectorControlManager.initialize();
    this.exportManager.initialize();
  }

  /**
   * Initialize references to application-level DOM elements
   */
  private initializeElementReferences(): void {
    // Only keep application-level controls here
    this.elements = {
      resetBtn: document.getElementById('resetBtn')
    };
  }
  
  /**
   * Bind all control events
   */
  bindControlEvents(): void {
    // Bind events in all managers
    this.imageManager.bindEvents();
    this.colorControlManager.bindEvents();
    this.cropControlManager.bindEvents();
    this.borderControlManager.bindEvents();
    this.noiseControlManager.bindEvents();
    this.smoothingControlManager.bindEvents();
    this.vectorControlManager.bindEvents();
    this.exportManager.bindEvents();
    
    // Bind application-level events
    this.bindResetButton();
    this.bindCustomEvents();
  }
  
  /**
   * Bind custom events for communication between managers
   */
  private bindCustomEvents(): void {
    // Listen for process image event
    document.addEventListener('posterize:processImage', () => {
      this.imageManager.processImage();
    });
    
    // Listen for vector preview events with debouncing (500ms)
    const debouncedPreviewUpdate = debounce(() => {
      this.vectorControlManager.updatePreview();
    }, 500);
    
    document.addEventListener('posterize:generateVectorPreview', debouncedPreviewUpdate);
    
    // Listen for download events
    document.addEventListener('posterize:downloadSvg', (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.vectorOutput) {
        this.exportManager.downloadSvgFile(customEvent.detail.vectorOutput);
      }
    });
    
    document.addEventListener('posterize:downloadZip', (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.vectorOutput) {
        this.exportManager.downloadLayersAsZip(customEvent.detail.vectorOutput);
      }
    });
  }
  
  /**
   * Bind reset button
   */
  private bindResetButton(): void {
    const { resetBtn } = this.elements;

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetApplication();
      });
    }
  }

  /**
   * Reset application to initial state
   */
  private resetApplication(): void {
    // Get default state
    this.currentState = this.stateManagementService.getDefaultState();

    // Clear localStorage
    this.stateManagementService.saveState(this.currentState);

    // Reset UI through updateControls
    this.updateControls(this.currentState);
    
    // Hide vector preview container
    const vectorPreviewContainer = document.getElementById('vectorPreviewContainer');
    if (vectorPreviewContainer) vectorPreviewContainer.style.display = 'none';
    
    // Hide canvas
    const canvas = document.getElementById('canvas');
    if (canvas) (canvas as HTMLCanvasElement).style.display = 'none';
    
    // Reset file input
    const fileInput = document.getElementById('fileInput');
    if (fileInput) (fileInput as HTMLInputElement).value = '';
  }

  /**
   * Update all controls based on state
   */
  updateControls(state: AppState): void {
    this.currentState = state;
    
    // Update all managers with the new state
    this.imageManager.updateControls(state);
    this.colorControlManager.updateControls(state);
    this.cropControlManager.updateControls(state);
    this.borderControlManager.updateControls(state);
    this.noiseControlManager.updateControls(state);
    this.smoothingControlManager.updateControls(state);
    this.vectorControlManager.updateControls(state);
    this.exportManager.updateControls(state);
  }
}
