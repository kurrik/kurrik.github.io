/**
 * OutlineService - Responsible for adding outlines to vector paths
 * Separated from cross-hatching to follow single responsibility principle
 */

import { VectorLayer, VectorOutput, VectorPathData } from '../../types/interfaces';

// Type definition for extended VectorLayer with pathData
type VectorLayerWithPathData = VectorLayer & { pathData?: string[] };

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

    // Process each layer, adding outlines based on stored path data
    vectorOutput.layers.forEach((layer) => {
      if (!layer.visible) {
        // Preserve invisible layers
        outlinedLayers.push(layer);
        return;
      }

      // Cast to our extended type to access pathData
      const layerWithPathData = layer as VectorLayerWithPathData;
      
      // Create a new layer with outlined paths
      const outlinedPaths: VectorPathData[] = [];
      
      // Use the stored path data if available, otherwise use existing paths
      if (layerWithPathData.pathData && layerWithPathData.pathData.length > 0) {
        // Generate outline paths from the stored path data
        layerWithPathData.pathData.forEach(pathData => {
          console.log('OUTLINE SERVICE: Adding outline with lineWidth:', lineWidth);
          outlinedPaths.push({
            d: pathData,
            fill: 'none',
            stroke: '#000000',  // Always use black for pen plotting
            strokeWidth: lineWidth.toString(), // Use the pen width setting
            regionType: 'outline' // All paths created by outline service are outlines
          });
        });
      }
      
      // Add the outlined layer (with or without paths)
      outlinedLayers.push({
        id: layer.id,
        paths: outlinedPaths,
        visible: true,
        // Preserve the path data for other services to use
        ...(layerWithPathData.pathData ? { pathData: layerWithPathData.pathData } : {})
      } as VectorLayerWithPathData);
    });
    
    // Return a new vector output with outlined layers
    return {
      dimensions: { width, height },
      layers: outlinedLayers,
      background: vectorOutput.background
    };
  }
}
