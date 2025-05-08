/**
 * Vector Conversion Strategy Interface
 * 
 * This interface defines the contract for different vector conversion strategies
 * following the Strategy pattern. Each strategy implements a different approach
 * to converting raster image data to vector format.
 */

import { ImageData, VectorOutput, VectorSettings } from '../../types/interfaces';

export interface VectorConversionStrategy {
  /**
   * Convert raster image data to vector format according to this strategy
   * @param imageData The processed image data to convert
   * @param settings Vector conversion settings
   * @returns A VectorOutput object containing the SVG paths
   */
  convertToVector(imageData: ImageData, settings: VectorSettings): VectorOutput;
  
  /**
   * Get the name of this strategy for display in UI
   */
  getName(): string;
  
  /**
   * Get the identifier for this strategy
   */
  getId(): string;
}
