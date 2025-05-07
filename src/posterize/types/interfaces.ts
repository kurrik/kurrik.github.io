/**
 * Core interfaces for the Posterize application
 */

// ----- Domain Models -----

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface RGBAPixel {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface ImageData {
  dimensions: ImageDimensions;
  pixels: Uint8ClampedArray;
  metadata?: Record<string, any>;
}

export interface NoiseSettings {
  enabled: boolean;
  minRegionSize: number;
}

export interface SmoothSettings {
  enabled: boolean;
  strength: number;
}

export interface BorderSettings {
  enabled: boolean;
  thickness: number;
}

export interface PosterizeSettings {
  colorCount: number;
  thresholds: number[];
  noiseSettings: NoiseSettings;
  smoothSettings: SmoothSettings;
  borderSettings: BorderSettings;
}

export type AspectRatioSetting = '1:1' | '4:3' | '5:3' | '4:6' | '8.5:11';
export type CropMode = 'crop' | 'fit';

export interface CropSettings {
  aspectRatio: AspectRatioSetting;
  mode: CropMode;
}

export interface VectorPathData {
  d: string;
  fill: string;
  stroke: string;
  strokeWidth: string;
}

export interface VectorLayer {
  id: string;
  paths: VectorPathData[];
  visible: boolean;
}

export interface VectorOutput {
  dimensions: ImageDimensions;
  layers: VectorLayer[];
  background: string;
}

export enum VectorType {
  FILLED = 'filled',
  OUTLINE = 'outline',
  CROSSHATCHED = 'crosshatched'
}

export enum StrategyType {
  STENCIL = 'stencil',
  PEN_DRAWING = 'pen_drawing'
}

export interface VectorSettings {
  type: VectorType;
  curveSmoothing: number;
  exportLayers: boolean;
  crossHatchingSettings?: CrossHatchingSettings;
}

export interface CrossHatchingSettings {
  enabled: boolean;
  density: number;
  angle: number;
  lineWidth: number;
}

// ----- Application DTOs -----

export interface AppState {
  posterizeSettings: PosterizeSettings;
  cropSettings: CropSettings;
  vectorSettings: VectorSettings;
  crossHatchingSettings: CrossHatchingSettings;
  originalImageDataUrl?: string;
}

export interface ImageProcessingRequest {
  imageData: ImageData;
  settings: PosterizeSettings;
}

export interface ImageProcessingResult {
  processedImageData: ImageData;
  buckets: Uint8Array;
}

export interface VectorConversionRequest {
  processedImageData: ImageData;
  buckets: Uint8Array;
  settings: VectorSettings;
}

export interface VectorConversionResult {
  vectorOutput: VectorOutput;
}

// ----- Service Interfaces -----

export interface IPosterizeService {
  process(request: ImageProcessingRequest): ImageProcessingResult;
}

export interface INoiseRemovalService {
  removeNoise(buckets: Uint8Array, width: number, height: number, minSize: number, colorCount: number): void;
}

export interface ISmoothingService {
  smoothBuckets(buckets: Uint8Array, width: number, height: number, colorCount: number, iterations: number): void;
}

export interface IVectorConversionStrategy {
  strategyType: StrategyType;
  displayName: string;
  description: string;
  convert(buckets: Uint8Array, dimensions: ImageDimensions, settings: VectorSettings): VectorOutput;
  getContextualSettings(): Record<string, any>;
}

export interface IVectorConversionService {
  registerStrategy(strategy: IVectorConversionStrategy): void;
  getStrategy(strategyType: StrategyType): IVectorConversionStrategy;
  getAvailableStrategies(): IVectorConversionStrategy[];
  setActiveStrategy(strategyType: StrategyType): void;
  getActiveStrategy(): IVectorConversionStrategy;
  convert(request: VectorConversionRequest): VectorConversionResult;
}

export interface ICrossHatchingService {
  applyToVectorOutput(vectorOutput: VectorOutput, settings: CrossHatchingSettings): VectorOutput;
}

export interface IImageProcessingService {
  processImage(imageData: ImageData, settings: PosterizeSettings): ImageProcessingResult;
  generateVector(result: ImageProcessingResult, settings: VectorSettings): VectorConversionResult;
  applyCrossHatching(vectorResult: VectorConversionResult, settings: CrossHatchingSettings): VectorOutput;
}

export interface IStateManagementService {
  saveState(state: AppState): void;
  loadState(): AppState | null;
}

export interface IExportService {
  exportSvg(vectorOutput: VectorOutput): string;
  exportLayersAsZip(vectorOutput: VectorOutput): Promise<Blob>;
}

// ----- Infrastructure Interfaces -----

export interface ILocalStorageAdapter {
  save(key: string, data: any): void;
  load<T>(key: string): T | null;
  remove(key: string): void;
}

export interface IOpenCVAdapter {
  isReady(): boolean;
  findContours(mask: any): { contours: any, hierarchy: any };
}

export interface IFileSystemAdapter {
  readAsDataURL(file: File): Promise<string>;
  createDownloadableBlob(content: string, mimeType: string): { url: string, blob: Blob };
  triggerDownload(url: string, filename: string): void;
}

// ----- UI Component Interfaces -----

export interface IUIControlManager {
  bindControlEvents(): void;
  updateControls(state: AppState): void;
}

export interface ILayerPanelManager {
  createLayerControls(vectorOutput: VectorOutput): void;
  updateLayerVisibility(layerId: string, visible: boolean): void;
}

export interface IPreviewManager {
  renderCanvas(imageData: ImageData): void;
  renderVectorPreview(vectorOutput: VectorOutput): void;
}
