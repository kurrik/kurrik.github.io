/**
 * Implementation of vector conversion strategies
 */
import {
  IVectorConversionStrategy,
  StrategyType,
  VectorOutput,
  VectorSettings,
  ImageDimensions,
  VectorLayer,
  VectorPathData,
  VectorType
} from '../../../types/interfaces';

/**
 * Base class for vector conversion strategies
 */
export abstract class BaseVectorConversionStrategy implements IVectorConversionStrategy {
  abstract strategyType: StrategyType;
  abstract displayName: string;
  abstract description: string;

  /**
   * Convert a posterized image to vector graphics using this strategy
   */
  abstract convert(buckets: Uint8Array, dimensions: ImageDimensions, settings: VectorSettings): VectorOutput;
  
  /**
   * Get the contextual settings specific to this strategy
   */
  abstract getContextualSettings(): Record<string, any>;

  /**
   * Convert an OpenCV contour to an SVG path string
   */
  protected contourToPath(contour: any): string {
    let path = '';

    // Get the number of points in the contour
    const count = contour.rows || contour.size();

    if (count === 0) {
      return path;
    }

    // For the first point
    let x = 0, y = 0;

    // Safely access contour data - handle different OpenCV.js contour formats
    if (contour.data32S) {
      // If contour has data32S property (common in OpenCV.js)
      x = contour.data32S[0];
      y = contour.data32S[1];
    } else if (contour.data) {
      // Fallback to generic data property
      x = contour.data[0];
      y = contour.data[1];
    } else {
      // Last resort: try to get a point at index 0
      try {
        const point = contour.get(0);
        x = point.x;
        y = point.y;
        // Clean up the point if it's an OpenCV object
        if (typeof point.delete === 'function') {
          point.delete();
        }
      } catch (e) {
        console.error('Failed to get contour point data:', e);
        return 'M0,0Z'; // Return a minimal valid path as fallback
      }
    }

    // Start the path
    path = `M${x},${y}`;

    // Add line segments for each point
    for (let i = 1; i < count; i++) {
      if (contour.data32S) {
        x = contour.data32S[i * 2];
        y = contour.data32S[i * 2 + 1];
      } else if (contour.data) {
        x = contour.data[i * 2];
        y = contour.data[i * 2 + 1];
      } else {
        try {
          const point = contour.get(i);
          x = point.x;
          y = point.y;
          if (typeof point.delete === 'function') {
            point.delete();
          }
        } catch (e) {
          console.error('Failed to get contour point:', e);
          continue;
        }
      }

      path += ` L${x},${y}`;
    }

    // Close the path
    path += 'Z';

    return path;
  }

  /**
   * Create a placeholder output when OpenCV is not available or errors occur
   */
  protected createPlaceholderOutput(width: number, height: number, colorCount: number): VectorOutput {
    const layers: VectorLayer[] = [];

    for (let bucket = 0; bucket < colorCount; bucket++) {
      const pathsForBucket: VectorPathData[] = [];

      // Sample color for this bucket (using HSL for better visual distinction)
      const color = `hsla(${bucket * 360 / colorCount}, 80%, 60%, 0.55)`;

      // Add a test path as placeholder
      pathsForBucket.push({
        d: `M10,${10 + bucket * 20} h${width - 20} v20 h-${width - 20}z`,
        fill: color,
        stroke: '#333',
        strokeWidth: '0.7'
      });

      layers.push({
        id: `layer-${bucket}`,
        paths: pathsForBucket,
        visible: true
      });
    }

    const vectorOutput: VectorOutput = {
      dimensions: { width, height },
      layers,
      background: '#f7f7f7'
    };

    return vectorOutput;
  }
}

/**
 * Stencil Strategy - Uses filled regions with borders (current implementation)
 */
export class StencilConversionStrategy extends BaseVectorConversionStrategy {
  strategyType = StrategyType.STENCIL;
  displayName = "Stencil";
  description = "Filled regions with borders - good for stencil designs and color separations";

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

        // Use RETR_TREE for full hierarchy
        const RETR_MODE = 3; // RETR_TREE
        const CHAIN_APPROX = 2; // CHAIN_APPROX_SIMPLE
        cv.findContours(mask, contours, hierarchy, RETR_MODE, CHAIN_APPROX);

        // Parse hierarchy
        const nContours = contours.size();
        const hier = hierarchy.data32S;
        const contourTree = [] as Array<{ idx: number; children: number[]; parent: number }>;
        for (let i = 0; i < nContours; ++i) {
          contourTree.push({
            idx: i,
            children: [],
            parent: hier[i * 4 + 3]
          });
        }
        for (let i = 0; i < nContours; ++i) {
          if (contourTree[i].parent !== -1) {
            contourTree[contourTree[i].parent].children.push(i);
          }
        }

        // SVG color
        const color = `hsla(${bucket * 360 / colorCount}, 80%, 60%, 0.95)`;
        const borderThickness = settings.type === VectorType.OUTLINE ? 2 : 1;

        // Helper: bounding box for merging (optional, for parity with legacy)
        const getBoundingBox = (cnt: any) => {
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          if (cnt.data32S) {
            for (let j = 0; j < cnt.data32S.length; j += 2) {
              const x = cnt.data32S[j], y = cnt.data32S[j + 1];
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }
          }
          return { minX, minY, maxX, maxY };
        };
        const boxesIntersect = (a: any, b: any) => {
          return !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY);
        };

        // Recursive region collector
        let regionGroups: string[][] = [];
        let regionBoxes: any[][] = [];
        const collectRegions = (idx: number, depth = 0) => {
          if (idx < 0 || idx >= nContours) return;
          if (depth % 2 === 0) {
            const cnt = contours.get(idx);
            const path = this.contourToPath(cnt);
            const bbox = getBoundingBox(cnt);
            let merged = false;
            for (let g = 0; g < regionGroups.length; ++g) {
              let groupBoxes = regionBoxes[g];
              let intersects = groupBoxes.some(box => boxesIntersect(box, bbox));
              if (!intersects) {
                regionGroups[g].push(path);
                groupBoxes.push(bbox);
                merged = true;
                break;
              }
            }
            if (!merged) {
              regionGroups.push([path]);
              regionBoxes.push([bbox]);
            }
            cnt.delete();
          }
          // Recurse on children
          for (const childIdx of contourTree[idx].children) {
            collectRegions(childIdx, depth + 1);
          }
        };

        // Traverse roots
        for (let i = 0; i < nContours; ++i) {
          if (contourTree[i].parent === -1) collectRegions.call(this, i, 0);
        }
        // Output each group as a layer
        for (let group of regionGroups) {
          const pathData = group.join(' ');
          layers.push({
            id: `layer-${bucket}`,
            paths: [{
              d: pathData,
              fill: color,
              stroke: '#333',
              strokeWidth: borderThickness.toString()
            }],
            visible: true
          });
        }
        mask.delete();
        contours.delete();
        hierarchy.delete();
      }

    } catch (error) {
      console.error('Error in contour processing:', error);
      return this.createPlaceholderOutput(width, height, colorCount);
    }

    // Create a background color (white is a good default)
    const backgroundColor = '#ffffff';

    const vectorOutput: VectorOutput = {
      dimensions: { width, height },
      layers,
      background: backgroundColor
    };

    return vectorOutput;
  }

  getContextualSettings(): Record<string, any> {
    // Return settings specific to Stencil strategy
    return {
      exportLayers: true,
      showLayerControls: true
    };
  }
}

/**
 * Pen Drawing Strategy - Uses outlines and cross-hatching for pen plotter designs
 */
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
            id: `layer-${bucket}`,
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
          const endY = centerX + perp2Y * d + dir2Y * diagonal;
          
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
