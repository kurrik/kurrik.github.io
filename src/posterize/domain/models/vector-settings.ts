/**
 * Domain model for vector settings including cross-hatching for pen plotters
 */
import { 
  VectorSettings, 
  VectorType,
  StrategyType,
  CrossHatchingSettings 
} from '../../types/interfaces';

export class VectorSettingsModel implements VectorSettings {
  type: VectorType;
  curveSmoothing: number;
  exportLayers: boolean;
  crossHatchingSettings: CrossHatchingSettings;
  strategy: StrategyType;

  constructor(
    type: VectorType = VectorType.FILLED,
    curveSmoothing: number = 3,
    exportLayers: boolean = true,
    crossHatchingSettings?: Partial<CrossHatchingSettings>,
    strategy: StrategyType = StrategyType.STENCIL
  ) {
    this.type = type;
    this.curveSmoothing = curveSmoothing;
    this.exportLayers = exportLayers;
    this.strategy = strategy;
    
    // Initialize cross-hatching settings for pen plotter output
    this.crossHatchingSettings = {
      enabled: crossHatchingSettings?.enabled ?? false,
      density: crossHatchingSettings?.density ?? 5,
      angle: crossHatchingSettings?.angle ?? 45,
      lineWidth: crossHatchingSettings?.lineWidth ?? 0.5
    };
  }

  /**
   * Toggle cross-hatching mode for pen plotters
   */
  toggleCrossHatching(enabled: boolean): void {
    this.crossHatchingSettings.enabled = enabled;
    if (enabled) {
      // When enabling cross-hatching, automatically set to unfilled path type
      this.type = VectorType.OUTLINE;
    }
  }

  /**
   * Update cross-hatching density (line spacing for pen plotters)
   */
  updateCrossHatchingDensity(density: number): void {
    this.crossHatchingSettings.density = Math.max(1, Math.min(10, density));
  }

  /**
   * Update cross-hatching angle (pattern direction for pen plotters)
   */
  updateCrossHatchingAngle(angle: number): void {
    // Normalize angle to 0-180 range (pen plotter patterns repeat beyond this)
    this.crossHatchingSettings.angle = ((angle % 180) + 180) % 180;
  }

  /**
   * Get cross-hatching settings optimized for the tone level (0-1)
   * This varies pattern density based on luminance level for pen plotters
   */
  getCrossHatchingForTone(toneLevel: number): { density: number, angle: number } {
    // Base density from settings
    const baseDensity = this.crossHatchingSettings.density;
    
    // Modify density based on tone (darker areas get denser hatching)
    const scaledDensity = baseDensity * (1 + (1 - toneLevel));
    
    // For mid-tones, create cross-hatching patterns by varying angle
    // This creates the illusion of intermediate tones for pen plotters
    const baseAngle = this.crossHatchingSettings.angle;
    let angle = baseAngle;
    
    // For mid-tones (0.3-0.7), add perpendicular hatching for tonal variety
    if (toneLevel > 0.3 && toneLevel < 0.7) {
      // Use perpendicular angle for cross-hatching
      angle = (baseAngle + 90) % 180;
    }
    
    return { 
      density: scaledDensity, 
      angle: angle 
    };
  }

  /**
   * Clone the settings object
   */
  clone(): VectorSettingsModel {
    return new VectorSettingsModel(
      this.type,
      this.curveSmoothing,
      this.exportLayers,
      { ...this.crossHatchingSettings },
      this.strategy
    );
  }

  /**
   * Create a VectorSettingsModel from a partial object (for loading saved state)
   */
  static fromObject(obj: Partial<VectorSettings> = {}): VectorSettingsModel {
    return new VectorSettingsModel(
      obj.type || VectorType.FILLED,
      obj.curveSmoothing || 3,
      obj.exportLayers !== undefined ? obj.exportLayers : true,
      obj.crossHatchingSettings,
      obj.strategy || StrategyType.STENCIL
    );
  }
}
