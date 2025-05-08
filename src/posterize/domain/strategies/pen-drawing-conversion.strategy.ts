/**
 * Pen Drawing Strategy - Uses outlines with black strokes for pen plotter designs
 */
import {
  StrategyType,
  VectorOutput,
  VectorSettings,
  ImageDimensions,
  VectorLayer,
  VectorPathData,
  VectorType,
  ICrossHatchingService,
  CrossHatchingSettings
} from '../../types/interfaces';
import { BaseVectorConversionStrategy } from './base-vector-conversion.strategy';
import { CrossHatchingService } from '../services/cross-hatching-service';

/**
 * A pen drawing conversion strategy that renders regions with black outlines
 * and applies cross-hatching for simulating tones with pen plotters
 */
export class PenDrawingConversionStrategy extends BaseVectorConversionStrategy {
  strategyType = StrategyType.PEN_DRAWING;
  displayName = "Pen Drawing";
  description = "Optimized for pen plotters - uses outlines for vector output";
  
  // Create cross-hatching service instance for use by this strategy
  private crossHatchingService: ICrossHatchingService = new CrossHatchingService();
  
  /**
   * Get contextual settings specific to pen drawing
   */
  getContextualSettings(): Record<string, any> {
    return {
      // Cross-hatching settings would be shown in the UI
      crossHatchingEnabled: true,
      crossHatchingDensity: 5,
      crossHatchingAngle: 45
    };
  }
  
  /**
   * Convert posterized image data to vector format optimized for pen drawing
   * This implementation creates outlines and applies cross-hatching if enabled
   */
  convert(buckets: Uint8Array, dimensions: ImageDimensions, settings: VectorSettings): VectorOutput {
    console.log('--------------------------------------------------');
    console.log('PEN DRAWING STRATEGY CONVERT METHOD IS BEING CALLED!');
    console.log('This is the actual pen drawing implementation');
    console.log('--------------------------------------------------');
    console.log('PEN DRAWING STRATEGY: Converting with settings:', settings);
    
    // Get cross-hatching settings from vector settings or use defaults
    const crossHatchingSettings = settings.crossHatchingSettings || {
      enabled: false,
      density: 5,
      angle: 45,
      lineWidth: 1.5,
      outlineRegions: true
    };
    
    console.log('PEN DRAWING STRATEGY: Using cross-hatching settings:', crossHatchingSettings);
    
    const { width, height } = dimensions;
    const layers: VectorLayer[] = [];
    const colorCount = Math.max(...Array.from(buckets)) + 1;
    
    // Check for OpenCV
    if (typeof cv === 'undefined') {
      console.error('OpenCV.js is not loaded');
      return this.createEmptyOutput(width, height);
    }
    
    try {
      // Process all color buckets (including bucket 0, which could be black or darkest color)
      for (let bucket = 0; bucket < colorCount; bucket++) {
        // Create a binary mask for this bucket
        const mask = cv.Mat.zeros(height, width, cv.CV_8UC1);
        
        // Fill the mask with pixels matching this bucket
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (buckets[idx] === bucket) {
              mask.ucharPtr(y, x)[0] = 255; // White for matching pixels
            }
          }
        }
        
        // Find contours in the mask
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        // Use RETR_TREE to get all contours including holes
        const mode = 3; // CV_RETR_TREE = 3 (get all contours with hierarchy)
        const method = 2; // CV_CHAIN_APPROX_SIMPLE = 2
        cv.findContours(mask, contours, hierarchy, mode, method);
        
        const paths: VectorPathData[] = [];
        
        // Convert each contour to a path
        for (let i = 0; i < contours.size(); i++) {
          const contour = contours.get(i);
          
          // Skip small contours - use approximation since contourArea might not be available
          // Count points as a rough estimation of contour size
          if (contour.data32S && contour.data32S.length < 10) {
            contour.delete();
            continue;
          }
          
          // Convert contour to path data
          const pathData = this.contourToPath(contour);
          
          // Add path with pen drawing styling (no fill, black stroke)
          // Use lineWidth from cross-hatching settings if available
          // Format the line width as explicit pixel value for SVG
          const penWidth = typeof crossHatchingSettings.lineWidth === 'number' ? 
            crossHatchingSettings.lineWidth : 
            parseFloat(String(crossHatchingSettings.lineWidth));
          
          console.log('PEN STRATEGY: Applying lineWidth:', penWidth, 'px');
          
          paths.push({
            d: pathData,
            fill: 'none',             // No fill for pen drawing
            stroke: '#000000',        // Black stroke
            strokeWidth: penWidth.toString()  // SVG requires string values
          });
          
          contour.delete();
        }
        
        // Add a layer for this bucket if it has paths
        if (paths.length > 0) {
          layers.push({
            id: `pen-layer-${bucket}`,
            paths,
            visible: true
          });
        }
        
        // Clean up OpenCV resources
        mask.delete();
        contours.delete();
        hierarchy.delete();
      }
      
      // Create the initial vector output
      const vectorOutput = {
        dimensions: { width, height },
        layers,
        background: '#ffffff' // White background
      };
      
      // If cross-hatching is enabled, apply it using the cross-hatching service
      if (crossHatchingSettings.enabled) {
        console.log('PEN DRAWING STRATEGY: Applying cross-hatching with settings:', JSON.stringify(crossHatchingSettings, null, 2));
        console.log('PEN DRAWING SETTINGS - lineWidth:', crossHatchingSettings.lineWidth, 'outlineRegions:', crossHatchingSettings.outlineRegions);
        
        // Make sure settings have the right types before passing to service
        const validatedSettings = {
          ...crossHatchingSettings,
          // Ensure lineWidth is a number
          lineWidth: typeof crossHatchingSettings.lineWidth === 'string' 
            ? parseFloat(crossHatchingSettings.lineWidth) 
            : crossHatchingSettings.lineWidth,
          // Ensure outlineRegions is a boolean
          outlineRegions: !!crossHatchingSettings.outlineRegions
        };
        
        console.log('PEN DRAWING STRATEGY: Using validated settings:', JSON.stringify(validatedSettings, null, 2));
        const result = this.crossHatchingService.applyToVectorOutput(vectorOutput, validatedSettings);
        return result;
      } else {
        console.log('PEN DRAWING STRATEGY: Cross-hatching disabled, returning regular output');
        return vectorOutput;
      }
      
    } catch (error) {
      console.error('Error in pen drawing conversion:', error);
      return this.createEmptyOutput(width, height);
    }
  }
  
  /**
   * Convert a contour to an SVG path string
   */
  protected contourToPath(contour: any): string {
    let d = '';
    const points = [];
    
    // Extract points from contour
    for (let j = 0; j < contour.data32S.length; j += 2) {
      points.push([contour.data32S[j], contour.data32S[j + 1]]);
    }
    
    // Create path data
    if (points.length > 0) {
      d = `M${points[0][0]},${points[0][1]}`;
      
      for (let j = 1; j < points.length; j++) {
        d += ` L${points[j][0]},${points[j][1]}`;
      }
      
      // Close the path
      d += ' Z';
    }
    
    return d;
  }
  
  /**
   * Create an empty output for error cases
   */
  private createEmptyOutput(width: number, height: number): VectorOutput {
    return {
      dimensions: { width, height },
      layers: [],
      background: '#ffffff'
    };
  }
}
