/**
 * View model for UI controls state
 */
import {
  PosterizeSettings,
  VectorSettings,
  AspectRatioSetting,
  CropMode,
  CrossHatchingSettings,
  AppState
} from '../../types/interfaces';
import { PosterizeSettingsModel } from '../../domain/models/posterize-settings';
import { VectorSettingsModel } from '../../domain/models/vector-settings';

export class ControlsViewModel {
  posterizeSettings: PosterizeSettingsModel;
  vectorSettings: VectorSettingsModel;
  aspectRatio: AspectRatioSetting = '1:1';
  cropMode: CropMode = 'crop';
  
  constructor(initialState?: AppState) {
    if (initialState) {
      this.posterizeSettings = initialState.posterizeSettings instanceof PosterizeSettingsModel
        ? initialState.posterizeSettings as PosterizeSettingsModel
        : PosterizeSettingsModel.fromObject(initialState.posterizeSettings);
        
      this.vectorSettings = initialState.vectorSettings instanceof VectorSettingsModel
        ? initialState.vectorSettings as VectorSettingsModel
        : VectorSettingsModel.fromObject(initialState.vectorSettings);
        
      this.aspectRatio = initialState.cropSettings.aspectRatio;
      this.cropMode = initialState.cropSettings.mode;
    } else {
      // Default settings
      this.posterizeSettings = new PosterizeSettingsModel();
      this.vectorSettings = new VectorSettingsModel();
    }
  }
  
  /**
   * Update color count
   */
  updateColorCount(value: number): void {
    this.posterizeSettings.updateColorCount(value);
  }
  
  /**
   * Update threshold at specific index
   */
  updateThreshold(index: number, value: number): void {
    if (index < 0 || index >= this.posterizeSettings.thresholds.length) {
      return;
    }
    this.posterizeSettings.thresholds[index] = value;
  }
  
  /**
   * Update aspect ratio
   */
  updateAspectRatio(value: AspectRatioSetting): void {
    this.aspectRatio = value;
  }
  
  /**
   * Update crop mode
   */
  updateCropMode(value: CropMode): void {
    this.cropMode = value;
  }
  
  /**
   * Update border settings
   */
  updateBorderSettings(enabled: boolean, thickness?: number): void {
    this.posterizeSettings.borderSettings.enabled = enabled;
    
    if (thickness !== undefined) {
      this.posterizeSettings.borderSettings.thickness = thickness;
    }
  }
  
  /**
   * Update noise settings
   */
  updateNoiseSettings(enabled: boolean, minRegionSize?: number): void {
    this.posterizeSettings.noiseSettings.enabled = enabled;
    
    if (minRegionSize !== undefined) {
      this.posterizeSettings.noiseSettings.minRegionSize = minRegionSize;
    }
  }
  
  /**
   * Update smoothing settings
   */
  updateSmoothSettings(enabled: boolean, strength?: number): void {
    this.posterizeSettings.smoothSettings.enabled = enabled;
    
    if (strength !== undefined) {
      this.posterizeSettings.smoothSettings.strength = strength;
    }
  }
  
  /**
   * Update cross-hatching settings
   */
  updateCrossHatchingSettings(settings: Partial<CrossHatchingSettings>): void {
    const { enabled, density, angle, lineWidth } = settings;
    
    if (enabled !== undefined) {
      this.vectorSettings.crossHatchingSettings.enabled = enabled;
    }
    
    if (density !== undefined) {
      this.vectorSettings.crossHatchingSettings.density = density;
    }
    
    if (angle !== undefined) {
      this.vectorSettings.crossHatchingSettings.angle = angle;
    }
    
    if (lineWidth !== undefined) {
      this.vectorSettings.crossHatchingSettings.lineWidth = lineWidth;
    }
  }
  
  /**
   * Convert to application state
   */
  toAppState(originalImageDataUrl?: string): AppState {
    return {
      posterizeSettings: this.posterizeSettings,
      vectorSettings: this.vectorSettings,
      cropSettings: {
        aspectRatio: this.aspectRatio,
        mode: this.cropMode
      },
      crossHatchingSettings: this.vectorSettings.crossHatchingSettings,
      originalImageDataUrl
    };
  }
  
  /**
   * Reset to default settings
   */
  reset(): void {
    this.posterizeSettings = new PosterizeSettingsModel();
    this.vectorSettings = new VectorSettingsModel();
    this.aspectRatio = '1:1';
    this.cropMode = 'crop';
  }
}
