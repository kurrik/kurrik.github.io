/**
 * OutlineService - Responsible for adding outlines to vector paths
 * Separated from cross-hatching to follow single responsibility principle
 */

import { VectorLayer, VectorOutput, VectorPathData } from '../../types/interfaces';

export class OutlineService {
  /**
   * Apply outlines to a vector output
   * @param vectorOutput The vector output to add outlines to
   * @param lineWidth The width of the outline strokes
   * @param outlineRegions Whether to draw outlines around regions
   * @returns A new vector output with outlines applied
   */
  public applyToVectorOutput(
    vectorOutput: VectorOutput,
    lineWidth: number,
    outlineRegions: boolean
  ): VectorOutput {
    console.log('OUTLINE SERVICE: Applying outlines with lineWidth:', lineWidth, 'outlineRegions:', outlineRegions);
    
    if (!outlineRegions) {
      console.log('OUTLINE SERVICE: Outlines disabled, returning original output');
      return vectorOutput;
    }
    
    const { width, height } = vectorOutput.dimensions;
    const outlinedLayers: VectorLayer[] = [];

    // Process each layer, adding outlines to paths
    vectorOutput.layers.forEach((layer) => {
      if (!layer.visible) {
        // Preserve invisible layers
        outlinedLayers.push(layer);
        return;
      }

      // Create a new layer with outlined paths
      const outlinedPaths: VectorPathData[] = [];
      
      // Process each path in the layer
      layer.paths.forEach(path => {
        // Add the outline path
        console.log('OUTLINE SERVICE: Adding outline with lineWidth:', lineWidth);
        outlinedPaths.push({
          d: path.d,
          fill: 'none',
          stroke: '#000000',  // Always use black for pen plotting
          strokeWidth: lineWidth.toString() // Use the pen width setting
        });
      });
      
      // Add the outlined layer (only if it has paths)
      if (outlinedPaths.length > 0) {
        outlinedLayers.push({
          id: layer.id,
          paths: outlinedPaths,
          visible: true
        });
      } else {
        // If there are no paths but the layer should exist, add an empty layer
        outlinedLayers.push({
          id: layer.id,
          paths: [],
          visible: true
        });
      }
    });
    
    // Return a new vector output with outlined layers
    return {
      dimensions: { width, height },
      layers: outlinedLayers,
      background: vectorOutput.background
    };
  }
}
