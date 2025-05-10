/**
 * Domain service for generating cross-hatching patterns
 * This service transforms filled regions into line patterns
 * suitable for pen plotter drawing with varying density/angle
 * to simulate different tones.
 */
import {
  CrossHatchingSettings,
  VectorOutput,
  VectorLayer,
  VectorPathData,
  ICrossHatchingService
} from '../../types/interfaces';
import Flatten from '@flatten-js/core';
// We'll implement local boolean operations using Flatten.js primitives
// rather than relying on the external package that's causing import issues
import { Polygon, Point, Segment, BooleanOperations } from '@flatten-js/core';

// Type definition for extended VectorLayer with pathData
type VectorLayerWithPathData = VectorLayer & { pathData?: string[] };

/**
 * Service for applying cross-hatching to vector outputs
 */
export class CrossHatchingService implements ICrossHatchingService {
  /**
   * Apply cross-hatching to a vector output
   */
  public applyToVectorOutput(
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
      // INVERTED: layerIndex 0 (darkest) -> toneLevel 0, last (lightest) -> toneLevel 1
      const toneLevel = (layerIndex / (vectorOutput.layers.length - 1 || 1));

      // Cast to our extended type to access pathData
      const layerWithPathData = layer as VectorLayerWithPathData;

      // Start with existing paths (like outlines added by the outline service)
      const crossHatchedPaths: VectorPathData[] = [...layer.paths];

      // Only add cross-hatching if enabled and we have path data
      if (validatedSettings.enabled && layerWithPathData.pathData && layerWithPathData.pathData.length > 0) {
        console.log(`CROSS-HATCHING: Processing ${layerWithPathData.pathData.length} path data entries for cross-hatching`);

        // Parse all paths to polygons and track region types
        const polygons: Flatten.Polygon[] = [];
        const regionTypes: ('outline' | 'hole' | 'island')[] = [];
          
        // First process paths with explicit region types
        for (let i = 0; i < layer.paths.length; i++) {
          const path = layer.paths[i];
          if (path.d && path.regionType) {
            const polygon = this.parseSvgPathToPolygon(path.d);
            if (polygon) {
              polygons.push(polygon);
              regionTypes.push(path.regionType);
              console.log(`CROSS-HATCHING: Parsed polygon with region type: ${path.regionType}`);
            }
          }
        }
        
        // If no explicitly typed regions found, fallback to pathData and use index conventions
        if (polygons.length === 0 && layerWithPathData.pathData && layerWithPathData.pathData.length > 0) {
          console.log('CROSS-HATCHING: No explicit region types found, using index-based conventions');
          for (let i = 0; i < layerWithPathData.pathData.length; i++) {
            const pathData = layerWithPathData.pathData[i];
            const polygon = this.parseSvgPathToPolygon(pathData);
            if (polygon) {
              polygons.push(polygon);
              // Fall back to convention: index 0 = outline, odd indices = holes, even indices > 0 = islands
              if (i === 0) {
                regionTypes.push('outline');
              } else if (i % 2 === 1) {
                regionTypes.push('hole');
              } else {
                regionTypes.push('island');
              }
            }
          }
        }

        if (polygons.length === 0) {
          console.warn('CROSS-HATCHING: No valid polygons found');
          // Skip this layer and continue to the next iteration
          return crossHatchedLayers;
        }

        // Build a compound region handling holes and islands
        // Process polygons based on their region types (outline, hole, island)
        // This approach is more explicit than relying on array indices
        let compoundRegion: Flatten.Polygon | null = null;

        console.log(`CROSS-HATCHING: Starting to process ${polygons.length} polygons for compound region`);

        // First process all outlines to create the base region
        for (let i = 0; i < polygons.length; i++) {
          if (regionTypes[i] === 'outline') {
            console.log(`CROSS-HATCHING: Processing outline polygon at index ${i}`);
            if (!compoundRegion) {
              compoundRegion = polygons[i];
              console.log('CROSS-HATCHING: Set first outline polygon as base region');
            } else {
              // Unify with any other outlines
              try {
                const originalRegion: Flatten.Polygon = compoundRegion;
                compoundRegion = BooleanOperations.unify(compoundRegion, polygons[i]);
                console.log('CROSS-HATCHING: Unifying additional outline');
              } catch (error) {
                console.error('CROSS-HATCHING: Boolean union operation failed', error);
              }
            }
          }
        }

        // Next subtract all holes from the base region
        for (let i = 0; i < polygons.length; i++) {
          if (regionTypes[i] === 'hole' && compoundRegion) {
            console.log(`CROSS-HATCHING: Processing hole polygon at index ${i}`);
            try {
              const originalRegion: Flatten.Polygon = compoundRegion;
              compoundRegion = BooleanOperations.subtract(compoundRegion, polygons[i]);
              console.log('CROSS-HATCHING: Hole subtraction completed');

              // Check if the operation was successful
              if (compoundRegion === originalRegion) {
                console.warn('CROSS-HATCHING: Hole subtraction returned same object - likely failed');
              }
            } catch (error) {
              console.error('CROSS-HATCHING: Boolean subtract operation failed', error);
            }
          }
        }

        // Finally add back all islands that should appear inside holes
        for (let i = 0; i < polygons.length; i++) {
          if (regionTypes[i] === 'island' && compoundRegion) {
            console.log(`CROSS-HATCHING: Processing island polygon at index ${i}`);
            try {
              const originalRegion: Flatten.Polygon = compoundRegion;
              compoundRegion = BooleanOperations.unify(compoundRegion, polygons[i]);
              console.log('CROSS-HATCHING: Island union completed');

              // Check if the operation was successful
              if (compoundRegion === originalRegion) {
                console.warn('CROSS-HATCHING: Island union returned same object - likely failed');
              }
            } catch (error) {
              console.error('CROSS-HATCHING: Boolean union operation failed', error);
            }
          }
        }

        console.log('CROSS-HATCHING: Finished building compound region');

        if (!compoundRegion) {
          console.warn('CROSS-HATCHING: Failed to build compound region');
          // Skip this layer and continue to the next iteration
          return crossHatchedLayers;
        }

        // Create a dummy path for the cross-hatching function
        const dummyPath: VectorPathData = {
          d: '',  // Not used in cross-hatching when we have a compound region
          fill: 'none',
          stroke: '#000000',
          strokeWidth: '1',
          regionType: 'outline' // Cross-hatching serves as outline
        };

        // Generate cross-hatching patterns using the compound region
        console.log('CROSS-HATCHING: Adding cross-hatching patterns');
        const hatchingPatterns = this.generateCrossHatchingForPath(
          dummyPath,
          toneLevel,
          validatedSettings,
          width,
          height,
          compoundRegion
        );

        // Add only the cross-hatching patterns
        crossHatchedPaths.push(...hatchingPatterns);
      }

      // Add the layer with cross-hatching (and any existing paths)
      crossHatchedLayers.push({
        id: layer.id,
        paths: crossHatchedPaths,
        visible: true,
        // Preserve the path data for other services to use
        ...(layerWithPathData.pathData ? { pathData: layerWithPathData.pathData } : {})
      } as VectorLayerWithPathData);
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
   * Properly clipped to the shape boundaries for pen plotter output
   */
  private generateCrossHatchingForPath(
    path: VectorPathData,
    toneLevel: number,
    settings: CrossHatchingSettings,
    width: number,
    height: number,
    compoundRegion: Flatten.Polygon | null = null
  ): VectorPathData[] {
    console.log('CROSS-HATCHING: Generating patterns with lineWidth:', settings.lineWidth);
    const hatchingPaths: VectorPathData[] = [];

    // Verify we have valid path data or a compound region to work with
    if (!path.d && !compoundRegion) {
      console.warn('CROSS-HATCHING: No valid path data or compound region provided');
      return hatchingPaths;
    }
    
    if (compoundRegion) {
      console.log('CROSS-HATCHING: Using compound region for cross-hatching');
    } else {
      console.log('CROSS-HATCHING: Using path data for cross-hatching');
    }

    // Base spacing between lines (in pixels)
    // Darker tones (lower toneLevel) get denser hatching (smaller spacing)
    // INVERTED: toneLevel 0 (black) -> smallest spacing, toneLevel 1 (white) -> largest spacing
    const minSpacing = 4; // Slightly less dense for black regions
    const maxSpacing = 20;
    // As toneLevel increases (toward white), spacing increases (less hatching)
    const baseSpacing = minSpacing + (maxSpacing - minSpacing) * toneLevel;
    const spacing = baseSpacing / settings.density;
    // Optionally, for pure white (toneLevel ~1), skip hatching entirely
    if (toneLevel > 0.98) return [];

    // Calculate line patterns based on tone
    // Primary angle (0-180 degrees)
    const primaryAngle = settings.angle % 180;
    const radians = (primaryAngle * Math.PI) / 180;

    try {
      // Verify compound region is valid before generating hatching lines
      if (compoundRegion) {
        console.log('CROSS-HATCHING: Compound region box:', compoundRegion.box);
        console.log('CROSS-HATCHING: Compound region has data:', !!compoundRegion);
      }

      // Generate hatching lines clipped to the path boundary
      console.log(`CROSS-HATCHING: Generating primary hatching lines with spacing: ${spacing}, angle: ${radians * 180 / Math.PI}°`);
      const primaryHatchingLines = this.generateClippedHatchingLines(
        path.d,
        width,
        height,
        spacing,
        radians,
        settings.lineWidth,
        compoundRegion
      );

      console.log(`CROSS-HATCHING: Generated ${primaryHatchingLines.length} primary hatching lines`);

      // Add each primary hatching line segment as a separate path
      for (const linePath of primaryHatchingLines) {
        hatchingPaths.push({
          d: linePath,
          fill: 'none',
          stroke: '#000000', // Black stroke for pen plotting
          strokeWidth: settings.lineWidth.toString(),
          regionType: 'outline' // Cross-hatching is always an outline
        });
      }

      // For darker tones (< 0.5), add a second layer of hatching at 90° angle
      if (toneLevel < 0.5) {
        // Secondary angle (perpendicular to primary)
        const secondaryAngle = (primaryAngle + 90) % 180;
        const secondaryRadians = (secondaryAngle * Math.PI) / 180;

        // Use different spacing for the second layer
        const secondarySpacing = spacing * 1.5;

        // Generate secondary cross-hatching lines
        const secondaryHatchingLines = this.generateClippedHatchingLines(
          path.d,
          width,
          height,
          secondarySpacing,
          secondaryRadians,
          settings.lineWidth,
          compoundRegion
        );

        // Add each secondary hatching line segment as a separate path
        for (const linePath of secondaryHatchingLines) {
          hatchingPaths.push({
            d: linePath,
            fill: 'none',
            stroke: '#000000', // Black stroke for pen plotting
            strokeWidth: settings.lineWidth.toString(),
            regionType: 'outline' // Cross-hatching is always an outline
          });
        }
      }
    } catch (error) {
      console.error('CROSS-HATCHING: Error generating hatching lines', error);
    }

    console.log(`CROSS-HATCHING: Generated ${hatchingPaths.length} hatching paths`);
    return hatchingPaths;
  }

  /**
   * Parse an SVG path string into a Flatten.js polygon
   * @param svgPath SVG path data string
   * @returns Flatten.js polygon or null if parsing failed
   */
  private parseSvgPathToPolygon(svgPath: string): Flatten.Polygon | null {
    try {
      // Basic SVG path parser - handles M, L, Z commands
      // This is a simplified implementation that works for many basic paths
      const commands = svgPath.match(/[MLZ][^MLZ]*/g) || [];
      const points: Flatten.Point[] = [];

      let currentX = 0;
      let currentY = 0;

      for (const cmd of commands) {
        const type = cmd.charAt(0);
        const coords = cmd.substring(1).trim().split(/[\s,]+/).filter(c => c.length > 0).map(parseFloat);

        switch (type) {
          case 'M': // Move to
            for (let i = 0; i < coords.length; i += 2) {
              currentX = coords[i];
              currentY = coords[i + 1];
              if (i === 0) { // First point after M
                points.push(new Flatten.Point(currentX, currentY));
              } else { // Subsequent points are treated as L
                points.push(new Flatten.Point(currentX, currentY));
              }
            }
            break;

          case 'L': // Line to
            for (let i = 0; i < coords.length; i += 2) {
              currentX = coords[i];
              currentY = coords[i + 1];
              points.push(new Flatten.Point(currentX, currentY));
            }
            break;

          case 'Z': // Close path
            // Add the first point again to close the path
            if (points.length > 0 &&
              (points[0].x !== currentX || points[0].y !== currentY)) {
              points.push(new Flatten.Point(points[0].x, points[0].y));
            }
            break;
        }
      }

      // Create a polygon from the points
      if (points.length > 2) {
        // Create segments between consecutive points
        const segments: Flatten.Segment[] = [];
        for (let i = 0; i < points.length - 1; i++) {
          segments.push(new Flatten.Segment(points[i], points[i + 1]));
        }

        return new Flatten.Polygon(segments);
      }

      return null;
    } catch (error) {
      console.error('Error parsing SVG path:', error);
      return null;
    }
  }

  /**
   * Generate a set of line segments properly clipped to a shape boundary
   * For pen plotter output, we need to calculate actual geometry rather than using SVG clip-path
   * @param shapePath The SVG path data string defining the shape boundary
   * @param width Canvas width
   * @param height Canvas height
   * @param spacing Spacing between parallel hatching lines
   * @param angleRadians Angle of hatching lines in radians
   * @param lineWidth Line width for display purposes only
   * @returns Array of SVG path data strings for each clipped line segment
   */
  private generateClippedHatchingLines(
    shapePath: string,
    width: number,
    height: number,
    spacing: number,
    angleRadians: number,
    lineWidth: number,
    compoundRegion: Flatten.Polygon | null = null
  ): string[] {
    console.log('CROSS-HATCHING: Generating clipped hatching lines using Flatten.js');

    // Array to store the resulting clipped line segments
    const clippedSegments: string[] = [];

    try {
      // Use the provided compound region if available, otherwise parse the SVG path
      let clipRegion: Flatten.Polygon;

      if (compoundRegion) {
        // Use the compound region directly
        clipRegion = compoundRegion;
        console.log('CROSS-HATCHING: Using compound region for clipping');
        // Log compound region bounding box to verify it exists and has proper dimensions
        console.log(`CROSS-HATCHING: Region bounds - xmin: ${clipRegion.box.xmin}, ymin: ${clipRegion.box.ymin}, xmax: ${clipRegion.box.xmax}, ymax: ${clipRegion.box.ymax}`);
      } else {
        // Parse the SVG path to a Flatten.js polygon
        const polygon = this.parseSvgPathToPolygon(shapePath);

        if (!polygon) {
          throw new Error('Failed to parse SVG path to polygon');
        }

        clipRegion = polygon;
        console.log('CROSS-HATCHING: Using parsed path for clipping');
        // Log parsed path bounding box
        console.log(`CROSS-HATCHING: Region bounds - xmin: ${clipRegion.box.xmin}, ymin: ${clipRegion.box.ymin}, xmax: ${clipRegion.box.xmax}, ymax: ${clipRegion.box.ymax}`);
      }

      // Get the bounding box of the clip region
      const box = clipRegion.box;
      const bboxWidth = box.xmax - box.xmin;
      const bboxHeight = box.ymax - box.ymin;
      const bboxDiagonal = Math.sqrt(bboxWidth * bboxWidth + bboxHeight * bboxHeight);

      // Calculate normal vector perpendicular to hatching line direction
      const nx = Math.cos(angleRadians + Math.PI / 2);
      const ny = Math.sin(angleRadians + Math.PI / 2);

      // Direction vector along hatching lines
      const dx = Math.cos(angleRadians);
      const dy = Math.sin(angleRadians);

      // Center of the bounding box
      const centerX = (box.xmax + box.xmin) / 2;
      const centerY = (box.ymax + box.ymin) / 2;

      // Calculate appropriate spacing and number of lines
      // Add padding to ensure we cover the entire shape
      const paddingFactor = 1.2; // 20% extra lines to ensure coverage
      const numLines = Math.ceil(bboxDiagonal / spacing * paddingFactor);
      const startOffset = -bboxDiagonal / 2;

      // Generate and clip hatching lines
      for (let i = 0; i < numLines; i++) {
        // Calculate offset from center for this line
        const offset = startOffset + i * spacing;

        // Calculate a point on the line
        const cx = centerX + nx * offset;
        const cy = centerY + ny * offset;

        // Create an "infinite" line (well beyond our shape)
        const lineLength = bboxDiagonal * 2; // Make it long enough to span the shape
        const x1 = cx - dx * lineLength;
        const y1 = cy - dy * lineLength;
        const x2 = cx + dx * lineLength;
        const y2 = cy + dy * lineLength;

        // Create a Flatten.js line segment
        const lineSegment = new Flatten.Segment(
          new Flatten.Point(x1, y1),
          new Flatten.Point(x2, y2)
        );

        // Calculate intersection with the clip region
        // This returns an array of points or segments where the line intersects
        const intersections = clipRegion.intersect(lineSegment);

        // Debug intersection points
        if (i < 5) { // Only log for the first few lines to avoid spam
          console.log(`CROSS-HATCHING: Line ${i} has ${intersections.length} intersections with region`);
        } else if (i === 5) {
          console.log('CROSS-HATCHING: Suppressing further intersection logs for brevity');
        }

        // Process the intersections
        if (intersections.length > 0) {
          // For each pair of intersection points, create a line segment that's inside the clip region
          // We need to sort the intersections along the line
          const sortedPoints = intersections
            .filter(intersection => intersection instanceof Flatten.Point)
            .map(point => {
              const p = point as Flatten.Point;
              // Calculate parameter t along the line (0 at x1,y1 and 1 at x2,y2)
              const t = ((p.x - x1) * dx + (p.y - y1) * dy) / (lineLength * 2);
              return { point: p, t };
            })
            .sort((a, b) => a.t - b.t);

          // Create line segments between pairs of intersection points
          for (let j = 0; j < sortedPoints.length - 1; j += 2) {
            if (j + 1 < sortedPoints.length) {
              const p1 = sortedPoints[j].point;
              const p2 = sortedPoints[j + 1].point;

              // Add to our result
              clippedSegments.push(`M${p1.x.toFixed(2)},${p1.y.toFixed(2)} L${p2.x.toFixed(2)},${p2.y.toFixed(2)}`);
            }
          }
        }
      }

      console.log(`CROSS-HATCHING: Generated ${clippedSegments.length} clipped line segments`);
    } catch (error) {
      console.error('Error in cross-hatching:', error);

      // Fallback approach if Flatten.js fails
      console.log('CROSS-HATCHING: Using fallback hatching pattern');

      // Calculate diagonal length to ensure lines span the entire area
      const diagonalLength = Math.sqrt(width * width + height * height);

      // Calculate normal vector perpendicular to hatching direction
      const nx = Math.cos(angleRadians + Math.PI / 2);
      const ny = Math.sin(angleRadians + Math.PI / 2);

      // Direction vector for hatching lines
      const dx = Math.cos(angleRadians);
      const dy = Math.sin(angleRadians);

      // Use wider spacing for the fallback approach
      const adjustedSpacing = spacing * 2;
      const numLines = Math.ceil(diagonalLength / adjustedSpacing);
      const startOffset = -diagonalLength / 2;

      // Generate some hatching lines that cover the general shape area
      for (let i = 0; i < numLines; i++) {
        const offset = startOffset + i * adjustedSpacing;

        const cx = width / 2 + nx * offset;
        const cy = height / 2 + ny * offset;

        // Make the lines span about 70% of the area to approximate clipping
        const lineLength = diagonalLength * 0.7;
        const x1 = cx - dx * lineLength / 2;
        const y1 = cy - dy * lineLength / 2;
        const x2 = cx + dx * lineLength / 2;
        const y2 = cy + dy * lineLength / 2;

        clippedSegments.push(`M${x1.toFixed(2)},${y1.toFixed(2)} L${x2.toFixed(2)},${y2.toFixed(2)}`);
      }
    }

    console.log(`CROSS-HATCHING: Generated ${clippedSegments.length} clipped line segments`);
    return clippedSegments;
  }

  /**
   * Generate a set of parallel lines to create a hatching pattern
   * Kept for reference - now replaced by generateClippedHatchingLines
   * @deprecated Use generateClippedHatchingLines instead
   */
  private generateHatchingLines(
    width: number,
    height: number,
    spacing: number,
    angleRadians: number,
    lineWidth: number,
    clipPath: string
  ): VectorPathData {
    console.log('CROSS-HATCHING: Generating hatching lines with lineWidth:', lineWidth);
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

    // SVG stroke-width doesn't use px units, it's just a number as a string
    // Create a properly formatted stroke width value
    const strokeWidthValue = lineWidth.toString();

    return {
      d: lines.join(' '),
      fill: 'none',
      stroke: '#000000', // Always use black for pen plotting
      strokeWidth: strokeWidthValue, // Pure number as string without px units
      regionType: 'outline' // Hatching lines are always outlines
    };
  }
}
