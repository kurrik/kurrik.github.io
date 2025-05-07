/**
 * Domain service for converting posterized images to vector graphics
 */
import { 
  IVectorConversionService, 
  VectorConversionRequest, 
  VectorConversionResult,
  VectorOutput,
  VectorLayer,
  VectorPathData
} from '../../types/interfaces';

export class VectorConversionService implements IVectorConversionService {
  /**
   * Convert a posterized image to vector graphics
   */
  convert(request: VectorConversionRequest): VectorConversionResult {
    const { processedImageData, buckets, settings } = request;
    const { width, height } = processedImageData.dimensions;
    
    const layers: VectorLayer[] = [];
    const colorCount = Math.max(...buckets) + 1;
    
    // Create OpenCV mat and process each color bucket
    if (typeof cv === 'undefined') {
      console.error('OpenCV.js is not loaded');
      const placeholderOutput = this.createPlaceholderOutput(width, height, colorCount);
      return { vectorOutput: placeholderOutput };
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
        
        // Use the correct OpenCV constants for contour finding modes
        // RETR_EXTERNAL = 0, RETR_LIST = 1, RETR_CCOMP = 2, RETR_TREE = 3
        const RETR_MODE = 2; // RETR_CCOMP equivalent
        
        // CHAIN_APPROX_NONE = 1, CHAIN_APPROX_SIMPLE = 2, CHAIN_APPROX_TC89_L1 = 3...
        const CHAIN_APPROX = 2; // CHAIN_APPROX_SIMPLE equivalent
        
        // Find contours
        cv.findContours(mask, contours, hierarchy, RETR_MODE, CHAIN_APPROX);
        
        // Sample color for this bucket (using HSL for better visual distinction)
        const color = `hsla(${bucket * 360 / colorCount}, 80%, 60%, 0.95)`;
        
        // Process contours to create SVG paths
        const pathsForBucket: VectorPathData[] = [];
        // Use the border settings from the PosterizeSettings
        const borderThickness = settings.type === 'outline' ? 2 : 1; // Default to 1 for filled type
        
        // Extract contour data and build paths
        for (let i = 0; i < contours.size(); i++) {
          const cnt = contours.get(i);
          
          // Skip tiny contours that might be noise
          // Calculate contour area - use appropriate method based on OpenCV availability
          let area = 0;
          try {
            area = cv.contourArea(cnt);
          } catch (e) {
            console.warn('Error calculating contour area:', e);
          }
          if (area < 2) {
            cnt.delete();
            continue;
          }
          
          // Convert contour to SVG path string
          const path = this.contourToPath(cnt);
          
          // Create SVG path data
          pathsForBucket.push({
            d: path,
            fill: color,
            stroke: '#333',
            strokeWidth: borderThickness.toString()
          });
          
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
      const placeholderOutput = this.createPlaceholderOutput(width, height, colorCount);
      return { vectorOutput: placeholderOutput };
    }
    
    // Create a background color (white is a good default)
    const backgroundColor = '#ffffff';
    
    const vectorOutput: VectorOutput = {
      dimensions: { width, height },
      layers,
      background: backgroundColor
    };
    
    return { vectorOutput };
  }
  
  /**
   * Convert an OpenCV contour to an SVG path string
   */
  private contourToPath(contour: any): string {
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
  private createPlaceholderOutput(width: number, height: number, colorCount: number): VectorOutput {
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
    
    return { vectorOutput };
  }
  
  /**
   * The actual vector conversion implementation will be more complex
   * and will include the following steps:
   * 
   * 1. For each bucket (color level):
   *    a. Create a binary mask
   *    b. Find contours using OpenCV.js
   *    c. Build a contour hierarchy tree
   *    d. Convert contours to SVG path data
   *    e. Group related paths (outer contours and their holes)
   * 
   * 2. Optional processing like:
   *    a. Path simplification
   *    b. Curve fitting
   *    c. Similar region merging
   * 
   * Due to the dependency on OpenCV.js and the complexity of contour
   * processing, the full implementation will be handled by the
   * actual application code that integrates with the infrastructure layer.
   */
  
  /**
   * Helper function to generate a sample SVG string from vector output
   * This is useful for debugging and testing
   */
  generateSVGString(vectorOutput: VectorOutput): string {
    const { width, height } = vectorOutput.dimensions;
    
    let svgParts = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
    ];
    
    // Add background if specified
    if (vectorOutput.background) {
      svgParts.push(`<rect width="${width}" height="${height}" fill="${vectorOutput.background}" />`);
    }
    
    // Add each visible layer
    vectorOutput.layers.forEach(layer => {
      if (layer.visible) {
        layer.paths.forEach(path => {
          svgParts.push(
            `<path d="${path.d}" fill="${path.fill}" stroke="${path.stroke}" stroke-width="${path.strokeWidth}" />`
          );
        });
      }
    });
    
    svgParts.push('</svg>');
    return svgParts.join('\n');
  }
}
