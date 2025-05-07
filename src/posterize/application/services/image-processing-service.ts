/**
 * Application service that orchestrates the image processing pipeline
 */
import {
  IImageProcessingService,
  ImageData,
  PosterizeSettings,
  VectorSettings,
  CrossHatchingSettings,
  ImageProcessingResult,
  VectorConversionResult,
  VectorOutput,
  VectorConversionRequest
} from '../../types/interfaces';
import { PosterizeService } from '../../domain/services/posterize-service';
import { NoiseRemovalService } from '../../domain/services/noise-removal-service';
import { SmoothingService } from '../../domain/services/smoothing-service';
import { VectorConversionService } from '../../domain/services/vector-conversion-service';
import { CrossHatchingService } from '../../domain/services/cross-hatching-service';
import { ImageDataModel } from '../../domain/models/image-data';

export class ImageProcessingService implements IImageProcessingService {
  private posterizeService: PosterizeService;
  private noiseRemovalService: NoiseRemovalService;
  private smoothingService: SmoothingService;
  private vectorConversionService: VectorConversionService;
  private crossHatchingService: CrossHatchingService;

  constructor() {
    this.posterizeService = new PosterizeService();
    this.noiseRemovalService = new NoiseRemovalService();
    this.smoothingService = new SmoothingService();
    this.vectorConversionService = new VectorConversionService();
    this.crossHatchingService = new CrossHatchingService();
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

    // Apply border if enabled
    if (borderSettings.enabled && borderSettings.thickness > 0) {
      // Update the result with new buckets
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
    // Convert processed image to vector graphics
    const vectorRequest: VectorConversionRequest = {
      processedImageData: result.processedImageData,
      buckets: result.buckets,
      settings
    };

    return this.vectorConversionService.convert(vectorRequest);
  }

  /**
   * Apply cross-hatching to vector output
   */
  applyCrossHatching(vectorResult: VectorConversionResult, settings: CrossHatchingSettings): VectorOutput {
    // Apply cross-hatching if enabled
    return this.crossHatchingService.applyToVectorOutput(
      vectorResult.vectorOutput,
      settings
    );
  }

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
    
    // Generate vector output
    const vectorResult = this.generateVector(processingResult, vectorSettings);
    
    // Apply cross-hatching if enabled
    const finalOutput = this.applyCrossHatching(
      vectorResult, 
      vectorSettings.crossHatchingSettings
    );
    
    return finalOutput;
  }
}
