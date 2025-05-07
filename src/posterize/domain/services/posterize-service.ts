/**
 * Domain service for posterization (color quantization)
 */
import { 
  ImageProcessingRequest, 
  ImageProcessingResult, 
  IPosterizeService
} from '../../types/interfaces';
import { ImageDataModel } from '../models/image-data';

export class PosterizeService implements IPosterizeService {
  /**
   * Process an image according to posterize settings
   */
  process(request: ImageProcessingRequest): ImageProcessingResult {
    const { imageData, settings } = request;
    const { width, height } = imageData.dimensions;
    
    // Create bucket assignments (which color/tone each pixel belongs to)
    const buckets = new Uint8Array(width * height);
    const imageDataModel = imageData instanceof ImageDataModel 
      ? imageData as ImageDataModel 
      : new ImageDataModel(imageData.pixels, width, height, imageData.metadata);
    
    // Assign buckets based on luminance and thresholds
    for (let y = 0; y < height; ++y) {
      for (let x = 0; x < width; ++x) {
        const luminance = imageDataModel.getLuminance(x, y);
        let bucket = 0;
        
        // Find appropriate bucket based on threshold values
        while (bucket < settings.thresholds.length && luminance > settings.thresholds[bucket]) {
          bucket++;
        }
        
        buckets[y * width + x] = bucket;
      }
    }
    
    // Create output image data with posterized colors
    const outputPixels = new Uint8ClampedArray(imageData.pixels.length);
    
    for (let y = 0; y < height; ++y) {
      for (let x = 0; x < width; ++x) {
        const bucket = buckets[y * width + x];
        const value = Math.round(255 * (bucket / (settings.colorCount - 1)));
        
        const index = (y * width + x) * 4;
        outputPixels[index] = value;     // R
        outputPixels[index + 1] = value; // G
        outputPixels[index + 2] = value; // B
        outputPixels[index + 3] = imageData.pixels[index + 3]; // Preserve alpha
      }
    }
    
    const processedImageData = new ImageDataModel(
      outputPixels, 
      width, 
      height,
      imageData.metadata
    );
    
    return {
      processedImageData,
      buckets
    };
  }
  
  /**
   * Apply border to the processed image if enabled in settings
   */
  applyBorder(
    imageData: ImageDataModel, 
    thickness: number, 
    borderColor: number = 255
  ): void {
    const { width, height } = imageData.dimensions;
    
    // Draw top and bottom borders
    for (let y = 0; y < thickness; ++y) {
      for (let x = 0; x < width; ++x) {
        // Top border
        imageData.setPixel(x, y, {
          r: borderColor,
          g: borderColor,
          b: borderColor,
          a: 255
        });
        
        // Bottom border
        imageData.setPixel(x, height - 1 - y, {
          r: borderColor,
          g: borderColor,
          b: borderColor,
          a: 255
        });
      }
    }
    
    // Draw left and right borders
    for (let y = thickness; y < height - thickness; ++y) {
      for (let x = 0; x < thickness; ++x) {
        // Left border
        imageData.setPixel(x, y, {
          r: borderColor,
          g: borderColor,
          b: borderColor,
          a: 255
        });
        
        // Right border
        imageData.setPixel(width - 1 - x, y, {
          r: borderColor,
          g: borderColor,
          b: borderColor,
          a: 255
        });
      }
    }
  }
}
