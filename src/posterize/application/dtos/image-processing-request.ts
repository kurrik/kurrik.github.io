/**
 * DTO for image processing requests
 */
import { 
  ImageProcessingRequest, 
  ImageData, 
  PosterizeSettings 
} from '../../types/interfaces';

export class ImageProcessingRequestDTO implements ImageProcessingRequest {
  imageData: ImageData;
  settings: PosterizeSettings;
  
  constructor(imageData: ImageData, settings: PosterizeSettings) {
    this.imageData = imageData;
    this.settings = settings;
  }
  
  /**
   * Create a copy of the request
   */
  clone(): ImageProcessingRequestDTO {
    return new ImageProcessingRequestDTO(
      this.imageData,
      this.settings
    );
  }
}
