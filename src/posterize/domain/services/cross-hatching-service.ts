/**
 * Domain service for generating cross-hatching patterns
 * This service transforms filled regions into line patterns
 * suitable for pen plotter drawing with varying density/angle
 * to simulate different tones.
 */
import {
  ICrossHatchingService,
  VectorOutput,
  VectorLayer,
  VectorPathData,
  CrossHatchingSettings
} from '../../types/interfaces';

export class CrossHatchingService implements ICrossHatchingService {
  /**
   * Apply cross-hatching to a vector output
   * Transforms filled regions into line patterns with varying density
   */
  applyToVectorOutput(
    vectorOutput: VectorOutput,
    settings: CrossHatchingSettings
  ): VectorOutput {
    if (!settings.enabled) {
      return vectorOutput;
    }

    const { width, height } = vectorOutput.dimensions;
    const crossHatchedLayers: VectorLayer[] = [];

    // Process each layer, replacing fills with cross-hatching patterns
    vectorOutput.layers.forEach((layer, layerIndex) => {
      if (!layer.visible) {
        // Preserve invisible layers
        crossHatchedLayers.push(layer);
        return;
      }

      // Calculate tone level based on color brightness
      // For demo purposes, we'll use the layer index to determine tone
      // In a real implementation, we would analyze the fill color
      const toneLevel = 1 - (layerIndex / (vectorOutput.layers.length - 1 || 1));
      
      // Create a new layer with cross-hatched paths
      const crossHatchedPaths: VectorPathData[] = [];
      
      // Process each path in the layer
      layer.paths.forEach(path => {
        // Add the original path as an outline with no fill
        crossHatchedPaths.push({
          d: path.d,
          fill: 'none',
          stroke: path.stroke,
          strokeWidth: path.strokeWidth
        });
        
        // Add cross-hatching lines within the path
        const hatchingPatterns = this.generateCrossHatchingForPath(
          path,
          toneLevel,
          settings,
          width,
          height
        );
        
        crossHatchedPaths.push(...hatchingPatterns);
      });
      
      // Add the cross-hatched layer
      crossHatchedLayers.push({
        id: layer.id,
        paths: crossHatchedPaths,
        visible: true
      });
    });
    
    return {
      dimensions: vectorOutput.dimensions,
      layers: crossHatchedLayers,
      background: vectorOutput.background
    };
  }
  
  /**
   * Generate cross-hatching patterns for a specific path
   * This creates a series of lines that simulate tones for pen plotters
   */
  private generateCrossHatchingForPath(
    path: VectorPathData,
    toneLevel: number,
    settings: CrossHatchingSettings,
    width: number,
    height: number
  ): VectorPathData[] {
    const hatchingPaths: VectorPathData[] = [];
    
    // Base spacing between lines (in pixels)
    // Darker tones (lower toneLevel) get denser hatching (smaller spacing)
    const baseSpacing = Math.max(2, Math.min(20, 20 * (0.5 + toneLevel) / settings.density));
    
    // For very dark tones (< 0.3), use tighter spacing
    const spacing = toneLevel < 0.3 ? baseSpacing * 0.5 : baseSpacing;
    
    // Calculate line patterns based on tone
    // Primary angle (0-180 degrees)
    const primaryAngle = settings.angle % 180;
    const radians = (primaryAngle * Math.PI) / 180;
    
    // Create a clipping path for the hatching (using the original path shape)
    const clipPathId = `clip-${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate primary hatching lines
    const primaryHatching = this.generateHatchingLines(
      width, 
      height,
      spacing,
      radians,
      settings.lineWidth,
      `url(#${clipPathId})`
    );
    
    hatchingPaths.push(primaryHatching);
    
    // For darker tones (< 0.5), add a second layer of hatching at 90° angle
    if (toneLevel < 0.5) {
      // Secondary angle (perpendicular to primary)
      const secondaryAngle = (primaryAngle + 90) % 180;
      const secondaryRadians = (secondaryAngle * Math.PI) / 180;
      
      // Use different spacing for the second layer
      const secondarySpacing = spacing * 1.5;
      
      const secondaryHatching = this.generateHatchingLines(
        width,
        height,
        secondarySpacing,
        secondaryRadians,
        settings.lineWidth,
        `url(#${clipPathId})`
      );
      
      hatchingPaths.push(secondaryHatching);
    }
    
    return hatchingPaths;
  }
  
  /**
   * Generate a set of parallel lines to create a hatching pattern
   * These lines will be clipped by the shape path to create the hatching effect
   */
  private generateHatchingLines(
    width: number,
    height: number,
    spacing: number,
    angleRadians: number,
    lineWidth: number,
    clipPath: string
  ): VectorPathData {
    // Calculate diagonal length to ensure lines span the entire area
    const diagonalLength = Math.sqrt(width * width + height * height);
    
    // Calculate normal vector to determine spacing direction
    const nx = Math.cos(angleRadians + Math.PI / 2);
    const ny = Math.sin(angleRadians + Math.PI / 2);
    
    // Calculate direction vector for the hatching lines
    const dx = Math.cos(angleRadians);
    const dy = Math.sin(angleRadians);
    
    // Calculate line starting positions
    const lines: string[] = [];
    const numLines = Math.ceil(diagonalLength / spacing) * 2;
    const startOffset = -diagonalLength;
    
    for (let i = 0; i < numLines; i++) {
      // Calculate offset from center for this line
      const offset = startOffset + i * spacing;
      
      // Calculate a point on the line
      const cx = width / 2 + nx * offset;
      const cy = height / 2 + ny * offset;
      
      // Calculate line endpoints (ensuring they extend beyond the area)
      const x1 = cx - dx * diagonalLength;
      const y1 = cy - dy * diagonalLength;
      const x2 = cx + dx * diagonalLength;
      const y2 = cy + dy * diagonalLength;
      
      // Add line to path data
      lines.push(`M${x1},${y1} L${x2},${y2}`);
    }
    
    // Combine all lines into a single path
    return {
      d: lines.join(' '),
      fill: 'none',
      stroke: '#000',
      strokeWidth: lineWidth.toString(),
      // Note: In actual implementation, we would use clip-path with the shape path
    };
  }
}
