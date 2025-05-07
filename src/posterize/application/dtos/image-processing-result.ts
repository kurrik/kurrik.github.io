/**
 * DTO for image processing results
 */
import { 
  ImageProcessingResult, 
  ImageData
} from '../../types/interfaces';
import { ImageDataModel } from '../../domain/models/image-data';

export class ImageProcessingResultDTO implements ImageProcessingResult {
  processedImageData: ImageData;
  buckets: Uint8Array;
  
  constructor(processedImageData: ImageData, buckets: Uint8Array) {
    this.processedImageData = processedImageData;
    this.buckets = buckets;
  }
  
  /**
   * Create a deep copy of the result
   */
  clone(): ImageProcessingResultDTO {
    // Deep copy the image data
    let clonedImageData: ImageData;
    
    if (this.processedImageData instanceof ImageDataModel) {
      clonedImageData = (this.processedImageData as ImageDataModel).clone();
    } else {
      clonedImageData = {
        dimensions: { 
          width: this.processedImageData.dimensions.width,
          height: this.processedImageData.dimensions.height
        },
        pixels: new Uint8ClampedArray(this.processedImageData.pixels),
        metadata: this.processedImageData.metadata 
          ? { ...this.processedImageData.metadata } 
          : undefined
      };
    }
    
    // Deep copy the buckets
    const clonedBuckets = new Uint8Array(this.buckets);
    
    return new ImageProcessingResultDTO(clonedImageData, clonedBuckets);
  }
}
