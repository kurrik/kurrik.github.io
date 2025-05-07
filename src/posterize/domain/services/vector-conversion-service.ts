/**
 * Domain service for converting posterized images to vector graphics
 */
import {
  IVectorConversionService,
  IVectorConversionStrategy,
  VectorConversionRequest,
  VectorConversionResult,
  VectorOutput,
  VectorLayer,
  VectorPathData,
  StrategyType,
  ImageDimensions
} from '../../types/interfaces';

import {
  StencilConversionStrategy,
  PenDrawingConversionStrategy
} from './strategies/vector-conversion-strategies';

export class VectorConversionService implements IVectorConversionService {
  private strategies: Map<StrategyType, IVectorConversionStrategy> = new Map();
  private activeStrategy: StrategyType = StrategyType.STENCIL;

  constructor() {
    // Register default strategies
    this.registerStrategy(new StencilConversionStrategy());
    this.registerStrategy(new PenDrawingConversionStrategy());
  }

  /**
   * Register a new vector conversion strategy
   */
  registerStrategy(strategy: IVectorConversionStrategy): void {
    this.strategies.set(strategy.strategyType, strategy);
  }

  /**
   * Get a specific strategy by type
   */
  getStrategy(strategyType: StrategyType): IVectorConversionStrategy {
    const strategy = this.strategies.get(strategyType);
    if (!strategy) {
      throw new Error(`Strategy ${strategyType} not found`);
    }
    return strategy;
  }

  /**
   * Get all available strategies
   */
  getAvailableStrategies(): IVectorConversionStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Set the active strategy
   */
  setActiveStrategy(strategyType: StrategyType): void {
    if (!this.strategies.has(strategyType)) {
      throw new Error(`Strategy ${strategyType} not registered`);
    }
    this.activeStrategy = strategyType;
  }

  /**
   * Get the currently active strategy
   */
  getActiveStrategy(): IVectorConversionStrategy {
    return this.getStrategy(this.activeStrategy);
  }

  /**
   * Convert a posterized image to vector graphics using the active strategy
   */
  convert(request: VectorConversionRequest): VectorConversionResult {
    const { processedImageData, buckets, settings } = request;
    const { width, height } = processedImageData.dimensions;

    try {
      // Get the active strategy
      const strategy = this.getStrategy(this.activeStrategy);

      // Use the strategy to convert the image
      const vectorOutput = strategy.convert(buckets, processedImageData.dimensions, settings);

      return { vectorOutput };
    } catch (error) {
      console.error('Error in vector conversion:', error);

      // Fall back to a placeholder if there's an error
      const colorCount = Math.max(...buckets) + 1;
      return {
        vectorOutput: this.createPlaceholderOutput(width, height, colorCount)
      };
    }


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

    return vectorOutput;
  }
}
