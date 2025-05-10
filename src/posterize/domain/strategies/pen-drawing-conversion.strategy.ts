/**
 * Pen Drawing Strategy - Uses outlines with black strokes for pen plotter designs
 */
import {
  StrategyType,
  VectorOutput,
  VectorSettings,
  ImageDimensions,
  VectorLayer,
  VectorPathData,
  VectorType,
  ICrossHatchingService,
  CrossHatchingSettings
} from '../../types/interfaces';
import { BaseVectorConversionStrategy } from './base-vector-conversion.strategy';
import { CrossHatchingService } from '../services/cross-hatching-service';
import { OutlineService } from '../services/outline-service';

/**
 * A pen drawing conversion strategy that renders regions with black outlines
 * and applies cross-hatching for simulating tones with pen plotters
 */
export class PenDrawingConversionStrategy extends BaseVectorConversionStrategy {
  strategyType = StrategyType.PEN_DRAWING;
  displayName = "Pen Drawing";
  description = "Optimized for pen plotters - uses outlines for vector output";
  
  private crossHatchingService: ICrossHatchingService;
  private outlineService: OutlineService;
  
  constructor() {
    super();
    this.crossHatchingService = new CrossHatchingService();
    this.outlineService = new OutlineService();
  }
  
  /**
   * Get contextual settings specific to pen drawing
   */
  getContextualSettings(): Record<string, any> {
    return {
      // Cross-hatching settings would be shown in the UI
      crossHatchingEnabled: true,
      crossHatchingDensity: 5,
      crossHatchingAngle: 45
    };
  }
  
  /**
   * Convert posterized image data to vector format optimized for pen drawing
   * This implementation creates outlines and applies cross-hatching if enabled
   */
  convert(buckets: Uint8Array, dimensions: ImageDimensions, settings: VectorSettings): VectorOutput {
    console.log('--------------------------------------------------');
    console.log('PEN DRAWING STRATEGY CONVERT METHOD IS BEING CALLED!');
    console.log('This is the actual pen drawing implementation');
    console.log('--------------------------------------------------');
    console.log('PEN DRAWING STRATEGY: Converting with settings:', settings);
    
    // Get cross-hatching settings from vector settings or use defaults
    const crossHatchingSettings = settings.crossHatchingSettings || {
      enabled: false,
      density: 5,
      angle: 45,
      lineWidth: 1.5,
      outlineRegions: true
    };
    
    console.log('PEN DRAWING STRATEGY: Using cross-hatching settings:', crossHatchingSettings);
    
    const { width, height } = dimensions;
    const layers: VectorLayer[] = [];
    const colorCount = Math.max(...Array.from(buckets)) + 1;
    
    // Check for OpenCV
    if (typeof cv === 'undefined') {
      console.error('OpenCV.js is not loaded');
      return this.createEmptyOutput(width, height);
    }
    
    try {
      // Process all color buckets (including bucket 0, which could be black or darkest color)
      for (let bucket = 0; bucket < colorCount; bucket++) {
        // Create a binary mask for this bucket
        const mask = cv.Mat.zeros(height, width, cv.CV_8UC1);
        
        // Fill the mask with pixels matching this bucket
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (buckets[idx] === bucket) {
              mask.ucharPtr(y, x)[0] = 255; // White for matching pixels
            }
          }
        }
        
        // Find contours in the mask
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        // Use RETR_TREE to get all contours including holes
        const mode = 3; // CV_RETR_TREE = 3 (get all contours with hierarchy)
        const method = 2; // CV_CHAIN_APPROX_SIMPLE = 2
        cv.findContours(mask, contours, hierarchy, mode, method);
        
        // Store path data and region types for processing later
        const contourPathData: string[] = [];
        const regionTypes: ('outline' | 'hole' | 'island')[] = [];
        
        // Build a tree structure from the hierarchy data
        // The hierarchy array contains [next, previous, child, parent] indices for each contour
        type ContourNode = {
          index: number;
          depth: number;
          children: number[];
          parent: number;
        };
        
        const contourTree: ContourNode[] = [];
        const nContours = contours.size();
        
        // Initialize the contour tree
        for (let i = 0; i < nContours; i++) {
          contourTree.push({
            index: i,
            depth: 0,
            children: [],
            parent: -1
          });
        }
        
        // Populate the tree with hierarchy information
        // Hierarchy data in OpenCV.js is stored as Int32Array with 4 values per contour
        // Format: [next_contour, previous_contour, first_child, parent]
        const hierarchyData = hierarchy.data32S;
        
        for (let i = 0; i < nContours; i++) {
          // Hierarchy values are stored in groups of 4 integers per contour
          const baseIdx = i * 4;
          const next = hierarchyData[baseIdx];
          const prev = hierarchyData[baseIdx + 1];
          const firstChild = hierarchyData[baseIdx + 2];
          const parent = hierarchyData[baseIdx + 3];
          
          // Update parent info
          contourTree[i].parent = parent;
          
          // Update children list of the parent
          if (parent >= 0) {
            contourTree[parent].children.push(i);
          }
        }
        
        // Compute depth for each node
        const computeDepth = (nodeIndex: number, depth: number) => {
          contourTree[nodeIndex].depth = depth;
          for (const childIndex of contourTree[nodeIndex].children) {
            computeDepth(childIndex, depth + 1);
          }
        };
        
        // Start from all root nodes (no parent)
        for (let i = 0; i < nContours; i++) {
          if (contourTree[i].parent === -1) {
            computeDepth(i, 0);
          }
        }
        
        // Process each contour with its hierarchy information
        for (let i = 0; i < nContours; i++) {
          const contour = contours.get(i);
          
          // Skip small contours - use approximation since contourArea might not be available
          if (contour.data32S && contour.data32S.length < 10) {
            contour.delete();
            continue;
          }
          
          // Convert contour to path data
          const pathData = this.contourToPath(contour);
          
          // Determine region type based on depth
          // Even depths are shapes (0 = outline, 2,4,6... = islands)
          // Odd depths are holes (1,3,5...)
          let regionType: 'outline' | 'hole' | 'island';
          const depth = contourTree[i].depth;
          
          if (depth % 2 === 0) {
            // Even depth: outline or island
            regionType = depth === 0 ? 'outline' : 'island';
          } else {
            // Odd depth: hole
            regionType = 'hole';
          }
          
          // Store the path data and region type
          contourPathData.push(pathData);
          regionTypes.push(regionType);
          
          contour.delete();
        }
        
        // Log the number of paths in this bucket
        console.log(`PEN STRATEGY: Bucket ${bucket}: ${contourPathData.length} paths`);
        
        // Create paths with region type information for this bucket
        const typedPaths: VectorPathData[] = [];
        
        for (let i = 0; i < contourPathData.length; i++) {
          typedPaths.push({
            d: contourPathData[i],
            fill: 'none', // No fill for pen drawing
            stroke: 'none', // No stroke yet - will be added by outline service
            strokeWidth: '0',
            regionType: regionTypes[i]
          });
        }
        
        // Store the layer with paths that have region types
        layers.push({
          id: `pen-layer-${bucket}`,
          paths: typedPaths, // Include paths with region types
          visible: true,
          // Store bucket data and path data for services to use
          bucket: bucket,
          pathData: contourPathData
        } as VectorLayer & { bucket: number, pathData: string[] }); // Use type assertion
        
        // Log the layer that's being added
        console.log(`PEN STRATEGY: Adding layer for bucket ${bucket} with ${contourPathData.length} path data entries`);
        
        // Clean up OpenCV resources
        mask.delete();
        contours.delete();
        hierarchy.delete();
      }
      
      // Create the initial vector output
      const vectorOutput = {
        dimensions: { width, height },
        layers,
        background: '#ffffff' // White background
      };
      
      // Instead of chaining services sequentially, let's apply each service to the original output
      // and then combine their results to ensure neither overwrites the other
      
      // Start with the base vector output
      let baseOutput = vectorOutput;
      let outlineOutput = null;
      let crossHatchOutput = null;
      
      // Step 1: If outlines are enabled, apply outlines to the base output
      if (crossHatchingSettings.outlineRegions) {
        console.log('PEN DRAWING STRATEGY: Applying outlines');
        // Format line width as a number
        const lineWidth = typeof crossHatchingSettings.lineWidth === 'string' 
          ? parseFloat(crossHatchingSettings.lineWidth) 
          : crossHatchingSettings.lineWidth;
        
        // Apply outlines using the dedicated outline service
        outlineOutput = this.outlineService.applyToVectorOutput(
          baseOutput, 
          lineWidth,
          true // Enable outlines
        );
      }
      
      // Step 2: If cross-hatching is enabled, apply it to the base output
      if (crossHatchingSettings.enabled) {
        console.log('PEN DRAWING STRATEGY: Applying cross-hatching');
        
        // Make sure settings have the right types before passing to service
        const validatedSettings = {
          ...crossHatchingSettings,
          // Ensure lineWidth is a number
          lineWidth: typeof crossHatchingSettings.lineWidth === 'string' 
            ? parseFloat(crossHatchingSettings.lineWidth) 
            : crossHatchingSettings.lineWidth,
          // Cross-hatching service no longer handles outlines
          outlineRegions: false
        };
        
        // Apply cross-hatching using the cross-hatching service
        crossHatchOutput = this.crossHatchingService.applyToVectorOutput(baseOutput, validatedSettings);
      }
      
      // Step 3: Combine the outputs based on what features were enabled
      let finalOutput: VectorOutput;
      
      if (outlineOutput && crossHatchOutput) {
        // Both features enabled - combine their paths
        console.log('PEN DRAWING STRATEGY: Combining outline and cross-hatching outputs');
        finalOutput = {
          dimensions: baseOutput.dimensions,
          background: baseOutput.background,
          layers: []
        };
        
        // For each layer in the base output, create a combined layer
        baseOutput.layers.forEach((baseLayer, index) => {
          const outlinePaths = outlineOutput.layers[index]?.paths || [];
          const crossHatchPaths = crossHatchOutput.layers[index]?.paths || [];
          
          // Combine all paths from both outputs
          finalOutput.layers.push({
            id: baseLayer.id,
            paths: [...outlinePaths, ...crossHatchPaths],
            visible: true
          });
        });
      } else if (outlineOutput) {
        // Only outlines enabled
        finalOutput = outlineOutput;
      } else if (crossHatchOutput) {
        // Only cross-hatching enabled
        finalOutput = crossHatchOutput;
      } else {
        // Neither feature enabled
        finalOutput = baseOutput;
      }
      
      // Return the final result after applying all services
      return finalOutput;
      
    } catch (error) {
      console.error('Error in pen drawing conversion:', error);
      return this.createEmptyOutput(width, height);
    }
  }
  
  /**
   * Convert a contour to an SVG path string
   */
  protected contourToPath(contour: any): string {
    let d = '';
    const points = [];
    
    // Extract points from contour
    for (let j = 0; j < contour.data32S.length; j += 2) {
      points.push([contour.data32S[j], contour.data32S[j + 1]]);
    }
    
    // Create path data
    if (points.length > 0) {
      d = `M${points[0][0]},${points[0][1]}`;
      
      for (let j = 1; j < points.length; j++) {
        d += ` L${points[j][0]},${points[j][1]}`;
      }
      
      // Close the path
      d += ' Z';
    }
    
    return d;
  }
  
  /**
   * Create an empty output for error cases
   */
  private createEmptyOutput(width: number, height: number): VectorOutput {
    return {
      dimensions: { width, height },
      layers: [],
      background: '#ffffff'
    };
  }
}
