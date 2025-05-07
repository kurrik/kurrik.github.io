/**
 * Posterize Application - Main Entry Point
 * 
 * This file serves as the main entry point for the Posterize application.
 * It initializes all the components and sets up the application.
 */

import { ImageProcessingService } from './application/services/image-processing-service';
import { StateManagementService } from './application/services/state-management-service';
import { ExportService } from './application/services/export-service';

import { PosterizeService } from './domain/services/posterize-service';
import { NoiseRemovalService } from './domain/services/noise-removal-service';
import { SmoothingService } from './domain/services/smoothing-service';
import { VectorConversionService } from './domain/services/vector-conversion-service';
import { CrossHatchingService } from './domain/services/cross-hatching-service';

import { LocalStorageAdapter } from './infrastructure/adapters/local-storage-adapter';
import { OpenCVAdapter } from './infrastructure/adapters/opencv-adapter';
import { FileSystemAdapter } from './infrastructure/adapters/file-system-adapter';

import { UIControlManager } from './ui/components/ui-control-manager';
import { LayerPanelManager } from './ui/components/layer-panel-manager';
import { PreviewManager } from './ui/components/preview-manager';

import { ImageViewModel } from './ui/view-models/image-view-model';
import { ControlsViewModel } from './ui/view-models/controls-view-model';

import { VectorType } from './types/interfaces';

/**
 * Main application class
 */
class PosterizeApp {
  // Services
  private imageProcessingService: ImageProcessingService;
  private stateManagementService: StateManagementService;
  private exportService: ExportService;
  
  // UI Components
  private uiControlManager: UIControlManager;
  private layerPanelManager: LayerPanelManager;
  private previewManager: PreviewManager;
  
  // View Models
  private imageViewModel: ImageViewModel;
  private controlsViewModel: ControlsViewModel;
  
  // Infrastructure adapters
  private localStorageAdapter: LocalStorageAdapter;
  private openCVAdapter: OpenCVAdapter;
  private fileSystemAdapter: FileSystemAdapter;
  
  // UI Elements
  private crossHatchingButton: HTMLButtonElement | null = null;
  
  constructor() {
    // Initialize infrastructure adapters
    this.localStorageAdapter = new LocalStorageAdapter();
    this.openCVAdapter = new OpenCVAdapter();
    this.fileSystemAdapter = new FileSystemAdapter();
    
    // Initialize services
    this.imageProcessingService = new ImageProcessingService();
    this.stateManagementService = new StateManagementService(this.localStorageAdapter);
    this.exportService = new ExportService(this.fileSystemAdapter);
    
    // Initialize view models
    this.imageViewModel = new ImageViewModel();
    const savedState = this.stateManagementService.loadState();
    this.controlsViewModel = new ControlsViewModel(savedState || undefined);
    
    // Initialize UI components
    this.uiControlManager = new UIControlManager(
      this.imageProcessingService,
      this.stateManagementService
    );
    this.layerPanelManager = new LayerPanelManager();
    this.previewManager = new PreviewManager();
  }
  
  /**
   * Initialize the application
   */
  initialize(): void {
    // Load state
    const savedState = this.stateManagementService.loadState();
    if (savedState !== null) {
      this.controlsViewModel = new ControlsViewModel(savedState);
      this.uiControlManager.updateControls(savedState);
    }
    
    // Set up event bindings
    this.uiControlManager.bindControlEvents();
    
    // Create cross-hatching button
    this.createCrossHatchingButton();
    
    // Listen for OpenCV.js to load
    document.addEventListener('opencv-loaded', () => {
      console.log('OpenCV.js loaded');
    });
    
    // Initialize UI based on current state
    this.updateUI();
    
    console.log('Posterize application initialized');
  }
  
  /**
   * Create cross-hatching button for pen plotter output
   */
  private createCrossHatchingButton(): void {
    // Find vector preview button
    const vectorPreviewBtn = document.getElementById('vectorPreviewBtn');
    if (!vectorPreviewBtn) {
      console.error('Vector preview button not found');
      return;
    }
    
    // Create cross-hatching button
    this.crossHatchingButton = document.createElement('button');
    this.crossHatchingButton.id = 'crossHatchingBtn';
    this.crossHatchingButton.textContent = 'Generate Pen Plotter SVG';
    this.crossHatchingButton.style.marginLeft = '8px';
    
    // Add tooltip explaining the feature
    this.crossHatchingButton.title = 'Generate an SVG optimized for pen plotters with cross-hatching patterns instead of filled regions';
    
    // Add highlight styling to make it stand out
    this.crossHatchingButton.style.backgroundColor = '#34d399';
    this.crossHatchingButton.style.color = '#064e3b';
    this.crossHatchingButton.style.border = '1px solid #059669';
    
    // Add event listener
    this.crossHatchingButton.addEventListener('click', () => {
      this.generateCrossHatchedSVG();
    });
    
    // Insert after vector preview button
    vectorPreviewBtn.parentNode?.insertBefore(
      this.crossHatchingButton,
      vectorPreviewBtn.nextSibling
    );
  }
  
  /**
   * Generate cross-hatched SVG for pen plotter
   */
  private generateCrossHatchedSVG(): void {
    if (!this.imageViewModel.hasProcessedResult()) {
      alert('Please process an image first.');
      return;
    }
    
    // Save the current settings
    const oldSettings = this.controlsViewModel.vectorSettings.clone();
    
    // Update vector settings to use cross-hatching
    this.controlsViewModel.vectorSettings.type = VectorType.OUTLINE;
    this.controlsViewModel.vectorSettings.crossHatchingSettings.enabled = true;
    
    // Generate vector output
    const result = this.imageProcessingService.generateVector(
      this.imageViewModel.processedResult!,
      this.controlsViewModel.vectorSettings
    );
    
    // Apply cross-hatching transform
    const crossHatchedOutput = this.imageProcessingService.applyCrossHatching(
      result,
      this.controlsViewModel.vectorSettings.crossHatchingSettings
    );
    
    // Display the result
    this.imageViewModel.setVectorOutput(crossHatchedOutput);
    this.previewManager.renderCrossHatchedPreview(crossHatchedOutput);
    this.layerPanelManager.createLayerControls(crossHatchedOutput);
    
    // Add download button
    const downloadBtn = document.getElementById('downloadSvgBtn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        this.exportService.downloadSvg(crossHatchedOutput, 'pen_plotter.svg');
      });
    }
    
    // Restore original settings
    this.controlsViewModel.vectorSettings = oldSettings;
  }
  
  /**
   * Update UI based on current state
   */
  private updateUI(): void {
    // Update controls
    this.uiControlManager.updateControls(this.controlsViewModel.toAppState());
  }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new PosterizeApp();
  app.initialize();
});
