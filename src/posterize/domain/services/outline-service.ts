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
      
      // First check if we have paths with region types already
      if (layer.paths && layer.paths.length > 0 && layer.paths.every(path => path.regionType)) {
        console.log('OUTLINE SERVICE: Using existing paths with region types');
        
        // Use the paths' existing region types
        layer.paths.forEach(path => {
          // Determine stroke color based on region type
          let strokeColor: string;
          
          switch (path.regionType) {
            case 'hole':
              strokeColor = '#FF0000'; // Red for holes
              break;
            case 'island':
              strokeColor = '#00FF00'; // Green for islands
              break;
            case 'outline':
            default:
              strokeColor = '#000000'; // Black for regular outlines
              break;
          }
          
          console.log(`OUTLINE SERVICE: Adding ${path.regionType} outline with color ${strokeColor}`);
          outlinedPaths.push({
            d: path.d,
            fill: 'none',
            stroke: strokeColor,
            strokeWidth: lineWidth.toString(),
            regionType: path.regionType
          });
        });
      }
      // Fallback: use path data with index-based type detection
      else if (layerWithPathData.pathData && layerWithPathData.pathData.length > 0) {
        console.log('OUTLINE SERVICE: Using fallback index-based region type detection');
        
        // Generate outline paths from the stored path data
        layerWithPathData.pathData.forEach((pathData, index) => {
          // Determine region type based on path index convention
          // Index 0 = outline, odd indices = holes, even indices > 0 = islands
          let regionType: 'outline' | 'hole' | 'island';
          let strokeColor: string;
          
          if (index === 0) {
            regionType = 'outline';
            strokeColor = '#000000'; // Black for regular outlines
          } else if (index % 2 === 1) {
            regionType = 'hole';
            strokeColor = '#FF0000'; // Red for holes
          } else {
            regionType = 'island';
            strokeColor = '#00FF00'; // Green for islands
          }
          
          console.log(`OUTLINE SERVICE: Adding ${regionType} outline with color ${strokeColor}`);
          outlinedPaths.push({
            d: pathData,
            fill: 'none',
            stroke: strokeColor,
            strokeWidth: lineWidth.toString(),
            regionType: regionType
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
