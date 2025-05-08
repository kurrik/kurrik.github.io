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
    console.log('CROSS-HATCHING DEBUG: Applying cross-hatching with settings:', settings);
    console.log('CROSS-HATCHING DEBUG: lineWidth type:', typeof settings.lineWidth, 'value:', settings.lineWidth);
    console.log('CROSS-HATCHING DEBUG: outlineRegions type:', typeof settings.outlineRegions, 'value:', settings.outlineRegions);
    
    // Ensure settings are properly typed
    const validatedSettings = {
      ...settings,
      // Ensure lineWidth is a number
      lineWidth: typeof settings.lineWidth === 'string' ? parseFloat(settings.lineWidth) : Number(settings.lineWidth),
      // Ensure outlineRegions is a boolean
      outlineRegions: settings.outlineRegions === true || (typeof settings.outlineRegions === 'string' && settings.outlineRegions === 'true')
    };
    
    console.log('CROSS-HATCHING DEBUG: Using validated settings:', validatedSettings);
    
    if (!validatedSettings.enabled) {
      console.log('CROSS-HATCHING DEBUG: Cross-hatching disabled, returning original output');
      return vectorOutput;
    }
    
    console.log('CROSS-HATCHING DEBUG: Cross-hatching is enabled, proceeding with application');

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
      
      // Keep existing paths (like outlines) and add cross-hatching
      const combinedPaths: VectorPathData[] = [...layer.paths]; // Start with existing paths
      
      // Process each path in the layer for cross-hatching
      layer.paths.forEach(path => {
        // Only add cross-hatching patterns if enabled
        if (validatedSettings.enabled) {
          // Generate cross-hatching patterns for this path
          console.log('CROSS-HATCHING DEBUG: Adding cross-hatching patterns');
          const hatchingPatterns = this.generateCrossHatchingForPath(
            path,
            toneLevel,
            validatedSettings,  // Use validated settings
            width,
            height
          );
          
          // Add the cross-hatching patterns to our combined paths
          combinedPaths.push(...hatchingPatterns);
        }
      });
      
      // Add the layer with both existing paths and cross-hatching
      crossHatchedLayers.push({
        id: layer.id,
        paths: combinedPaths, // Both original paths and cross-hatching
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
    console.log('CROSS-HATCHING DEBUG: Generating patterns with lineWidth:', settings.lineWidth);
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
    console.log('CROSS-HATCHING DEBUG: Generating hatching lines with lineWidth:', lineWidth);
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
    console.log('CROSS-HATCHING DEBUG: Final line width being used:', lineWidth, 'type:', typeof lineWidth);
    
    // SVG stroke-width doesn't use px units, it's just a number as a string
    // Create a properly formatted stroke width value
    const strokeWidthValue = lineWidth.toString();
    console.log('CROSS-HATCHING DEBUG: Using stroke width value:', strokeWidthValue);
    
    return {
      d: lines.join(' '),
      fill: 'none',
      stroke: '#000000', // Always use black for pen plotting
      strokeWidth: strokeWidthValue, // Pure number as string without px units
      // Note: In actual implementation, we would use clip-path with the shape path
    };
  }
}
