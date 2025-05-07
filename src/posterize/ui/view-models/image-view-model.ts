/**
 * View model for image data and processing state
 */
import { 
  ImageData, 
  ImageProcessingResult,
  VectorOutput,
  PosterizeSettings,
  VectorSettings
} from '../../types/interfaces';

export class ImageViewModel {
  // Original image data
  originalImageData: ImageData | null = null;
  originalImageUrl: string | null = null;
  
  // Processed image data 
  processedResult: ImageProcessingResult | null = null;
  
  // Vector output
  vectorOutput: VectorOutput | null = null;
  
  // Processing state
  isLoading: boolean = false;
  isProcessing: boolean = false;
  isGeneratingVector: boolean = false;
  
  // Error state
  error: string | null = null;
  
  constructor() {}
  
  /**
   * Update original image data
   */
  setOriginalImage(imageData: ImageData, url: string): void {
    this.originalImageData = imageData;
    this.originalImageUrl = url;
    this.processedResult = null;
    this.vectorOutput = null;
    this.error = null;
  }
  
  /**
   * Update processed image result
   */
  setProcessedResult(result: ImageProcessingResult): void {
    this.processedResult = result;
    this.vectorOutput = null;
    this.error = null;
  }
  
  /**
   * Update vector output
   */
  setVectorOutput(output: VectorOutput): void {
    this.vectorOutput = output;
    this.error = null;
  }
  
  /**
   * Set loading state
   */
  setLoading(loading: boolean): void {
    this.isLoading = loading;
  }
  
  /**
   * Set processing state
   */
  setProcessing(processing: boolean): void {
    this.isProcessing = processing;
  }
  
  /**
   * Set vector generation state
   */
  setGeneratingVector(generating: boolean): void {
    this.isGeneratingVector = generating;
  }
  
  /**
   * Set error message
   */
  setError(message: string | null): void {
    this.error = message;
  }
  
  /**
   * Check if image is loaded
   */
  hasImage(): boolean {
    return this.originalImageData !== null;
  }
  
  /**
   * Check if processed result is available
   */
  hasProcessedResult(): boolean {
    return this.processedResult !== null;
  }
  
  /**
   * Check if vector output is available
   */
  hasVectorOutput(): boolean {
    return this.vectorOutput !== null;
  }
  
  /**
   * Process image with given settings
   * This is a placeholder for the actual processing logic that would be
   * implemented by the application services
   */
  async processImage(
    imageProcessingService: any, 
    settings: PosterizeSettings
  ): Promise<void> {
    if (!this.originalImageData) {
      this.setError('No image to process');
      return;
    }
    
    try {
      this.setProcessing(true);
      this.setError(null);
      
      // Process image
      const result = await Promise.resolve(
        imageProcessingService.processImage(
          this.originalImageData, 
          settings
        )
      );
      
      this.setProcessedResult(result);
    } catch (error) {
      this.setError(`Error processing image: ${error}`);
    } finally {
      this.setProcessing(false);
    }
  }
  
  /**
   * Generate vector output with given settings
   * This is a placeholder for the actual vector generation logic
   */
  async generateVector(
    imageProcessingService: any, 
    settings: VectorSettings
  ): Promise<void> {
    if (!this.processedResult) {
      this.setError('No processed image to vectorize');
      return;
    }
    
    try {
      this.setGeneratingVector(true);
      this.setError(null);
      
      // Generate vector output
      const result = await Promise.resolve(
        imageProcessingService.generateVector(
          this.processedResult, 
          settings
        )
      );
      
      this.setVectorOutput(result.vectorOutput);
    } catch (error) {
      this.setError(`Error generating vector: ${error}`);
    } finally {
      this.setGeneratingVector(false);
    }
  }
  
  /**
   * Reset the view model
   */
  reset(): void {
    this.originalImageData = null;
    this.originalImageUrl = null;
    this.processedResult = null;
    this.vectorOutput = null;
    this.isLoading = false;
    this.isProcessing = false;
    this.isGeneratingVector = false;
    this.error = null;
  }
}
