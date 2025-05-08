/**
 * Application service that orchestrates the image processing pipeline
 */
import {
  IImageProcessingService,
  ImageData,
  PosterizeSettings,
  VectorSettings,
  ImageProcessingResult,
  VectorConversionResult,
  VectorOutput,
  VectorConversionRequest
} from '../../types/interfaces';
import { PosterizeService } from '../../domain/services/posterize-service';
import { NoiseRemovalService } from '../../domain/services/noise-removal-service';
import { SmoothingService } from '../../domain/services/smoothing-service';
import { VectorConversionService } from '../../domain/services/vector-conversion-service';
import { ImageDataModel } from '../../domain/models/image-data';

export class ImageProcessingService implements IImageProcessingService {
  private posterizeService: PosterizeService;
  private noiseRemovalService: NoiseRemovalService;
  private smoothingService: SmoothingService;
  private vectorConversionService: VectorConversionService;

  constructor() {
    this.posterizeService = new PosterizeService();
    this.noiseRemovalService = new NoiseRemovalService();
    this.smoothingService = new SmoothingService();
    this.vectorConversionService = new VectorConversionService();
  }

  /**
   * Process an image through the posterization pipeline
   */
  processImage(imageData: ImageData, settings: PosterizeSettings): ImageProcessingResult {
    // Process image through posterization
    const result = this.posterizeService.process({
      imageData,
      settings
    });

    const { buckets } = result;
    const { width, height } = imageData.dimensions;
    const { colorCount, noiseSettings, smoothSettings, borderSettings } = settings;

    // Apply noise removal if enabled
    if (noiseSettings.enabled) {
      this.noiseRemovalService.removeNoise(
        buckets,
        width,
        height,
        noiseSettings.minRegionSize,
        colorCount
      );
    }

    // Apply smoothing if enabled
    if (smoothSettings.enabled) {
      this.smoothingService.smoothBuckets(
        buckets,
        width,
        height,
        colorCount,
        smoothSettings.strength
      );
    }
    
    // Update the processed image data based on the modified buckets
    if (noiseSettings.enabled || smoothSettings.enabled) {
      // We need to update the processedImageData to reflect the changes in buckets
      const processedPixels = new Uint8ClampedArray(width * height * 4);
      
      for (let i = 0; i < buckets.length; i++) {
        const bucket = buckets[i];
        const pixelIndex = i * 4;
        
        // Calculate color for this bucket using a proper mapping that preserves contrast
        let bucketColor: number;
        
        // Map each bucket to its corresponding threshold value or to a full range
        // from black to white for better contrast
        if (bucket === 0) {
          bucketColor = 0; // Darkest bucket is always pure black
        } else if (bucket === colorCount - 1) {
          bucketColor = 255; // Lightest bucket is always pure white
        } else if (settings.thresholds && settings.thresholds.length > 0) {
          // For intermediate buckets, use the threshold values if available
          // We need to ensure these are properly spaced to maintain contrast
          const thresholdIndex = bucket - 1;
          if (thresholdIndex >= 0 && thresholdIndex < settings.thresholds.length) {
            bucketColor = settings.thresholds[thresholdIndex];
          } else {
            // Fallback to evenly distributed grayscale values
            bucketColor = Math.round(bucket * 255 / (colorCount - 1));
          }
        } else {
          // No thresholds available, distribute evenly
          bucketColor = Math.round(bucket * 255 / (colorCount - 1));
        }
        
        // Set RGBA values
        processedPixels[pixelIndex] = bucketColor;     // R
        processedPixels[pixelIndex + 1] = bucketColor; // G
        processedPixels[pixelIndex + 2] = bucketColor; // B
        processedPixels[pixelIndex + 3] = 255;         // A (fully opaque)
      }
      
      // Create a new ImageData object with the updated pixels
      const processedModel = new ImageDataModel(
        processedPixels,
        width,
        height,
        result.processedImageData.metadata
      );
      
      // Update the processed image data in the result
      result.processedImageData = processedModel;
    }

    // Apply border if enabled
    if (borderSettings.enabled && borderSettings.thickness > 0) {
      // Get the processed model, ensuring we have the correct instance type
      const processedModel = result.processedImageData instanceof ImageDataModel
        ? result.processedImageData as ImageDataModel
        : new ImageDataModel(
            result.processedImageData.pixels,
            width,
            height,
            result.processedImageData.metadata
          );

      this.posterizeService.applyBorder(processedModel, borderSettings.thickness);
      
      // Update processed image data
      result.processedImageData = processedModel;
    }

    return result;
  }

  /**
   * Generate vector graphics from processed image
   */
  generateVector(result: ImageProcessingResult, settings: VectorSettings): VectorConversionResult {
    // CRITICAL: First ensure that the correct strategy is set based on settings
    if (settings.strategy) {
      console.log(`ImageProcessingService: Setting active strategy to ${settings.strategy} before conversion`);
      // This line is critical - it ensures the strategy from settings is activated
      this.vectorConversionService.setActiveStrategy(settings.strategy);
    } else {
      console.warn('No strategy specified in vector settings, using default');
    }
    
    // Convert processed image to vector graphics
    const vectorRequest: VectorConversionRequest = {
      processedImageData: result.processedImageData,
      buckets: result.buckets,
      settings
    };

    return this.vectorConversionService.convert(vectorRequest);
  }

  // Cross-hatching is now handled directly by the pen drawing strategy
  // This is more aligned with DDD principles

  /**
   * Process an image through the entire pipeline
   * This is a convenience method to run all stages at once
   */
  processFull(
    imageData: ImageData,
    posterizeSettings: PosterizeSettings,
    vectorSettings: VectorSettings
  ): VectorOutput {
    // Run the image processing pipeline
    const processingResult = this.processImage(imageData, posterizeSettings);
    
    // Generate vector output using the appropriate strategy
    // The strategy will handle cross-hatching internally if needed
    const vectorResult = this.generateVector(processingResult, vectorSettings);
    
    // Return the vector output directly - cross-hatching is now handled by the strategy
    return vectorResult.vectorOutput;
  }
}
