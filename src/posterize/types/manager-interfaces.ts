/**
 * Interfaces for UI Manager components
 */
import {
  AppState,
  VectorOutput,
  ImageData,
  ImageProcessingResult
} from './interfaces';
import { ImageDataModel } from '../domain/models/image-data';

export interface IManager {
  initialize(): void;
  bindEvents(): void;
  updateControls(state: AppState): void;
}

export interface IImageManager extends IManager {
  loadImage(file: File): Promise<void>;
  loadImageFromUrl(url: string): void;
  processImage(): void;
  getCurrentImageData(): ImageDataModel | null;
}

export interface IColorControlManager extends IManager {
  renderThresholdControls(): void;
}

export interface ICropControlManager extends IManager {
  applyAspectRatio(img: HTMLImageElement, ctx: CanvasRenderingContext2D, width: number, height: number): void;
}

export interface IBorderControlManager extends IManager {}

export interface INoiseControlManager extends IManager {}

export interface ISmoothingControlManager extends IManager {}

export interface IVectorControlManager extends IManager {
  generateVectorPreview(): void;
  renderVectorPreview(vectorOutput: VectorOutput): void;
  createVectorLayerControls(vectorOutput: VectorOutput): void;
  generateCrossHatchedPreview(): void;
}

export interface IExportManager extends IManager {
  downloadSvgFile(vectorOutput: VectorOutput): void;
  downloadLayersAsZip(vectorOutput: VectorOutput): Promise<void>;
}
