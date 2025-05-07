/**
 * Domain model for posterize settings
 */
import { 
  PosterizeSettings, 
  NoiseSettings, 
  SmoothSettings, 
  BorderSettings 
} from '../../types/interfaces';

export class PosterizeSettingsModel implements PosterizeSettings {
  colorCount: number;
  thresholds: number[];
  noiseSettings: NoiseSettings;
  smoothSettings: SmoothSettings;
  borderSettings: BorderSettings;

  constructor(
    colorCount: number = 3,
    thresholds?: number[],
    noiseSettings?: Partial<NoiseSettings>,
    smoothSettings?: Partial<SmoothSettings>,
    borderSettings?: Partial<BorderSettings>
  ) {
    this.colorCount = colorCount;
    this.thresholds = thresholds || this.generateDefaultThresholds(colorCount);
    
    this.noiseSettings = {
      enabled: noiseSettings?.enabled ?? false,
      minRegionSize: noiseSettings?.minRegionSize ?? 8
    };
    
    this.smoothSettings = {
      enabled: smoothSettings?.enabled ?? false,
      strength: smoothSettings?.strength ?? 2
    };
    
    this.borderSettings = {
      enabled: borderSettings?.enabled ?? true,
      thickness: borderSettings?.thickness ?? 3
    };
  }

  /**
   * Generate evenly spaced thresholds based on the color count
   */
  generateDefaultThresholds(colorCount: number): number[] {
    return Array.from(
      { length: colorCount - 1 }, 
      (_, i) => Math.round(255 * (i + 1) / colorCount)
    );
  }

  /**
   * Update color count and recalculate thresholds if needed
   */
  updateColorCount(colorCount: number, preserveThresholds: boolean = false): void {
    this.colorCount = colorCount;
    
    if (!preserveThresholds) {
      this.thresholds = this.generateDefaultThresholds(colorCount);
    } else if (this.thresholds.length !== colorCount - 1) {
      // Resize and preserve existing thresholds as much as possible
      const newThresholds = this.generateDefaultThresholds(colorCount);
      const minLength = Math.min(this.thresholds.length, newThresholds.length);
      
      for (let i = 0; i < minLength; i++) {
        newThresholds[i] = this.thresholds[i];
      }
      
      this.thresholds = newThresholds;
    }
  }

  /**
   * Clone the settings object
   */
  clone(): PosterizeSettingsModel {
    return new PosterizeSettingsModel(
      this.colorCount,
      [...this.thresholds],
      { ...this.noiseSettings },
      { ...this.smoothSettings },
      { ...this.borderSettings }
    );
  }

  /**
   * Create settings object from a plain object (e.g., from JSON)
   */
  static fromObject(obj: Partial<PosterizeSettings>): PosterizeSettingsModel {
    return new PosterizeSettingsModel(
      obj.colorCount,
      obj.thresholds,
      obj.noiseSettings,
      obj.smoothSettings,
      obj.borderSettings
    );
  }
}
