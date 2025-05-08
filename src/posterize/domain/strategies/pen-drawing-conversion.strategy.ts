/**
 * Pen Drawing Strategy - Uses outlines and cross-hatching for pen plotter designs
 */
import {
  StrategyType,
  VectorOutput,
  VectorSettings,
  ImageDimensions,
} from '../../types/interfaces';
import { BaseVectorConversionStrategy } from './base-vector-conversion.strategy';

export class PenDrawingConversionStrategy extends BaseVectorConversionStrategy {
  convert(buckets: Uint8Array, dimensions: ImageDimensions, settings: VectorSettings): VectorOutput {
    throw new Error('Method not implemented.');
  }
  getContextualSettings(): Record<string, any> {
    throw new Error('Method not implemented.');
  }
  strategyType = StrategyType.PEN_DRAWING;
  displayName = "Pen Drawing";
  description = "Optimized for pen plotters - uses outlines and cross-hatching for tonal values";
}
