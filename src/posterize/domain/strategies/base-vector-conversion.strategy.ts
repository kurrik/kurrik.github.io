/**
 * Base class for vector conversion strategies
 */
import {
  IVectorConversionStrategy,
  StrategyType,
  VectorOutput,
  VectorSettings,
  ImageDimensions,
  VectorLayer
} from '../../types/interfaces';

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
      const pathsForBucket = [];

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
        id: `layer-${bucket}-${layers.length}`,
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
