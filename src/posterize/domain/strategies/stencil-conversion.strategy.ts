/**
 * Stencil Strategy - Uses filled regions with borders
 */
import {
  StrategyType,
  VectorOutput,
  VectorSettings,
  ImageDimensions,
  VectorLayer,
  VectorPathData,
  VectorType
} from '../../types/interfaces';
import { BaseVectorConversionStrategy } from './base-vector-conversion.strategy';

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

        // Build tree structure for child-parent relationships
        for (let i = 0; i < nContours; ++i) {
          if (contourTree[i].parent !== -1) {
            contourTree[contourTree[i].parent].children.push(i);
          }
        }

        // SVG color with higher opacity to match original implementation
        const color = `hsla(${bucket * 360 / colorCount}, 80%, 60%, 0.95)`;
        const borderThickness = settings.type === VectorType.OUTLINE ? 2 : 1;

        // Helper: bounding box for merging (for parity with original implementation)
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

        // Recursive region collector to properly handle subregions
        let regionGroups: string[][] = [];
        let regionBoxes: any[][] = [];
        
        const collectRegions = (idx: number, depth = 0) => {
          if (idx < 0 || idx >= nContours) return;
          
          // Even depths are shapes, odd depths are holes
          if (depth % 2 === 0) {
            const cnt = contours.get(idx);
            const path = this.contourToPath(cnt);
            const bbox = getBoundingBox(cnt);
            let merged = false;
            
            // Try to merge with an existing group
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
            
            // If not merged, create a new group
            if (!merged) {
              regionGroups.push([path]);
              regionBoxes.push([bbox]);
            }
            
            cnt.delete();
          }
          
          // Recursively process children
          for (const childIdx of contourTree[idx].children) {
            collectRegions(childIdx, depth + 1);
          }
        };

        // Process all root contours (no parents)
        for (let i = 0; i < nContours; ++i) {
          if (contourTree[i].parent === -1) {
            collectRegions(i, 0);
          }
        }
        
        // Output each group as a separate layer
        for (let group of regionGroups) {
          const pathData = group.join(' ');
          layers.push({
            id: `layer-${bucket}-${layers.length}`,
            paths: [{
              d: pathData,
              fill: color,
              stroke: '#333',
              strokeWidth: borderThickness.toString()
            }],
            visible: true
          });
        }

        // Clean up OpenCV objects
        mask.delete();
        contours.delete();
        hierarchy.delete();
      }

      // Create final vector output
      const vectorOutput: VectorOutput = {
        dimensions: { width, height },
        layers,
        background: '#ffffff' // Fixed background color
      };

      return vectorOutput;
    } catch (error) {
      console.error('Error in vector conversion:', error);
      return this.createPlaceholderOutput(width, height, colorCount);
    }
  }

  getContextualSettings(): Record<string, any> {
    return {
      // No specific contextual settings for this strategy
      minimumArea: 5,
      strokeWidth: 0.5,
      backgroundColor: '#ffffff'
    };
  }
}
