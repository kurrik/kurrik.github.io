/**
 * Pen Drawing Strategy - Uses outlines and cross-hatching for pen plotter designs
 */
import {
  StrategyType,
  VectorOutput,
  VectorSettings,
  ImageDimensions,
  VectorLayer,
  VectorPathData
} from '../../types/interfaces';
import { BaseVectorConversionStrategy } from './base-vector-conversion.strategy';

export class PenDrawingConversionStrategy extends BaseVectorConversionStrategy {
  strategyType = StrategyType.PEN_DRAWING;
  displayName = "Pen Drawing";
  description = "Optimized for pen plotters - uses outlines and cross-hatching for tonal values";

  convert(buckets: Uint8Array, dimensions: ImageDimensions, settings: VectorSettings): VectorOutput {
    const { width, height } = dimensions;
    const layers: VectorLayer[] = [];
    const colorCount = Math.max(...buckets) + 1;

    // Create OpenCV mat and process each color bucket
    if (typeof cv === 'undefined') {
      console.error('OpenCV.js is not loaded');
      return this.createPlaceholderOutput(width, height, colorCount);
    }

    try {
      // Convert buckets array to a format OpenCV can use
      const bucketsData = new Uint8Array(buckets);

      // Process each color bucket to find contours
      for (let bucket = 0; bucket < colorCount; bucket++) {
        // Create a binary mask for this bucket
        const mask = cv.Mat.zeros(height, width, cv.CV_8UC1);

        // Fill the mask - we need to set each pixel where the bucket matches
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (buckets[idx] === bucket) {
              // Use ucharPtr to set individual pixel values
              mask.ucharPtr(y, x)[0] = 255; // White for the current bucket
            }
          }
        }

        // Find contours in the mask
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();

        // For pen drawing, we only want external contours
        const RETR_MODE = 0; // RETR_EXTERNAL
        const CHAIN_APPROX = 2; // CHAIN_APPROX_SIMPLE

        // Find contours
        cv.findContours(mask, contours, hierarchy, RETR_MODE, CHAIN_APPROX);

        // For pen drawing, use a thin stroke and no fill
        const strokeColor = '#000000';
        const strokeWidth = settings.crossHatchingSettings?.lineWidth?.toString() || '0.5';

        // Process contours to create SVG paths
        const pathsForBucket: VectorPathData[] = [];

        // Extract contour data and build paths
        for (let i = 0; i < contours.size(); i++) {
          const cnt = contours.get(i);

          // Skip tiny contours that might be noise
          let area = 0;
          try {
            const cvAny = cv as any;
            if (typeof cvAny.contourArea === 'function') {
              area = cvAny.contourArea(cnt);
            } else {
              const rect = cvAny.boundingRect ? cvAny.boundingRect(cnt) : null;
              if (rect) {
                area = rect.width * rect.height;
              }
            }
          } catch (e) {
            console.warn('Error calculating contour area:', e);
          }
          if (area < 5) { // Slightly higher threshold for pen drawing
            cnt.delete();
            continue;
          }

          // Convert contour to SVG path string
          const path = this.contourToPath(cnt);

          // Create SVG path data - for pen drawing we use no fill
          pathsForBucket.push({
            d: path,
            fill: 'none', // No fill for pen drawing
            stroke: strokeColor,
            strokeWidth: strokeWidth
          });

          // If cross-hatching is enabled, add hatching lines for this contour
          if (settings.crossHatchingSettings?.enabled && bucket > 0) {
            const hatching = this.generateCrossHatching(
              cnt, 
              bucket, 
              colorCount, 
              settings.crossHatchingSettings.density, 
              settings.crossHatchingSettings.angle
            );
            
            if (hatching) {
              pathsForBucket.push({
                d: hatching,
                fill: 'none',
                stroke: strokeColor,
                strokeWidth: (parseFloat(strokeWidth) * 0.8).toString() // Slightly thinner
              });
            }
          }

          // Clean up the contour object
          cnt.delete();
        }

        // Add this layer
        if (pathsForBucket.length > 0) {
          layers.push({
            id: `layer-${bucket}-${layers.length}`,
            paths: pathsForBucket,
            visible: true
          });
        }

        // Clean up OpenCV resources
        mask.delete();
        contours.delete();
        hierarchy.delete();
      }

    } catch (error) {
      console.error('Error in contour processing:', error);
      return this.createPlaceholderOutput(width, height, colorCount);
    }

    // Create a white background
    const backgroundColor = '#ffffff';

    const vectorOutput: VectorOutput = {
      dimensions: { width, height },
      layers,
      background: backgroundColor
    };

    return vectorOutput;
  }

  getContextualSettings(): Record<string, any> {
    // Return settings specific to Pen Drawing strategy
    return {
      showCrossHatchingControls: true,
      exportLayers: false
    };
  }

  /**
   * Generate cross-hatching lines for a contour
   */
  private generateCrossHatching(
    contour: any, 
    bucket: number, 
    colorCount: number, 
    density: number = 5, 
    angle: number = 45
  ): string {
    // Skip cross-hatching for black (bucket 0) or white (bucket colorCount-1)
    if (bucket === 0 || bucket === colorCount - 1) {
      return '';
    }

    try {
      // Get a bounding rectangle for the contour
      const rect = (cv as any).boundingRect(contour);
      if (!rect) return '';

      const { x, y, width, height } = rect;
      
      // Determine spacing based on bucket value and density
      // Darker buckets (lower values) get denser hatching
      const bucketRatio = bucket / (colorCount - 1);
      const spacing = Math.max(3, 30 / (density * (1 - bucketRatio + 0.1)));
      
      // Convert angle to radians
      const angleRad = angle * Math.PI / 180;
      
      // Calculate line direction vectors
      const dirX = Math.cos(angleRad);
      const dirY = Math.sin(angleRad);
      
      // Get a rotated bounding box to cover all possible hatching lines
      const diagonal = Math.sqrt(width * width + height * height);
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      
      // Calculate the range along the perpendicular direction
      const perpX = -dirY;
      const perpY = dirX;
      
      let paths: string[] = [];
      
      // Generate hatching lines separated by the spacing
      for (let d = -diagonal; d <= diagonal; d += spacing) {
        const startX = centerX + perpX * d - dirX * diagonal;
        const startY = centerY + perpY * d - dirY * diagonal;
        const endX = centerX + perpX * d + dirX * diagonal;
        const endY = centerY + perpY * d + dirY * diagonal;
        
        paths.push(`M${startX},${startY} L${endX},${endY}`);
      }
      
      // If the bucket is dark enough (< 50%), add cross-hatching in perpendicular direction
      if (bucketRatio < 0.5) {
        // Create secondary hatching at 90 degrees to primary
        const angle2Rad = (angle + 90) * Math.PI / 180;
        const dir2X = Math.cos(angle2Rad);
        const dir2Y = Math.sin(angle2Rad);
        const perp2X = -dir2Y;
        const perp2Y = dir2X;
        
        // Use wider spacing for the cross-hatching
        const spacing2 = spacing * 1.5;
        
        for (let d = -diagonal; d <= diagonal; d += spacing2) {
          const startX = centerX + perp2X * d - dir2X * diagonal;
          const startY = centerY + perp2Y * d - dir2Y * diagonal;
          const endX = centerX + perp2X * d + dir2X * diagonal;
          const endY = centerY + perp2Y * d + dir2Y * diagonal;
          
          paths.push(`M${startX},${startY} L${endX},${endY}`);
        }
      }
      
      return paths.join(' ');
    } catch (error) {
      console.error('Error generating cross-hatching:', error);
      return '';
    }
  }
}
