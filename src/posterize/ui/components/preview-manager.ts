/**
 * UI component for managing image and vector previews
 */
import {
  IPreviewManager,
  ImageData,
  VectorOutput
} from '../../types/interfaces';
import { ImageDataModel } from '../../domain/models/image-data';

export class PreviewManager implements IPreviewManager {
  private canvas: HTMLCanvasElement | null;
  private vectorPreviewContainer: HTMLElement | null;
  private vectorPreviewElement: HTMLElement | null;
  private ctx: CanvasRenderingContext2D | null = null;
  private _currentVectorOutput: VectorOutput | null = null;

  constructor(
    canvasId: string = 'canvas',
    vectorPreviewContainerId: string = 'vectorPreviewContainer',
    vectorPreviewElementId: string = 'vectorPreview'
  ) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.vectorPreviewContainer = document.getElementById(vectorPreviewContainerId);
    this.vectorPreviewElement = document.getElementById(vectorPreviewElementId);
    
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
    }
  }

  /**
   * Render image data to canvas
   */
  renderCanvas(imageData: ImageData): void {
    if (!this.canvas || !this.ctx) return;
    
    // Convert to canvas image data if needed
    let canvasImageData: ImageBitmap | globalThis.ImageData;
    
    if (imageData instanceof ImageDataModel) {
      canvasImageData = (imageData as ImageDataModel).toCanvasImageData();
    } else {
      canvasImageData = new globalThis.ImageData(
        imageData.pixels,
        imageData.dimensions.width,
        imageData.dimensions.height
      );
    }
    
    // Resize canvas if needed
    if (this.canvas.width !== imageData.dimensions.width ||
        this.canvas.height !== imageData.dimensions.height) {
      this.canvas.width = imageData.dimensions.width;
      this.canvas.height = imageData.dimensions.height;
    }
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw image data
    this.ctx.putImageData(canvasImageData as globalThis.ImageData, 0, 0);
    
    // Show canvas
    this.canvas.style.display = 'block';
  }

  /**
   * Get the current vector output
   */
  getVectorOutput(): VectorOutput | null {
    return this._currentVectorOutput;
  }

  /**
   * Render vector output as SVG
   */
  renderVectorPreview(vectorOutput: VectorOutput): void {
    // Store current vector output for later retrieval
    this._currentVectorOutput = vectorOutput;
    if (!this.vectorPreviewElement || !this.vectorPreviewContainer) return;
    
    // Show vector preview container
    this.vectorPreviewContainer.style.display = 'flex';
    
    // Clear previous preview
    this.vectorPreviewElement.innerHTML = '';
    
    // Create SVG preview
    const { width, height } = vectorOutput.dimensions;
    const svgNS = 'http://www.w3.org/2000/svg';
    
    // Create container for SVG preview
    const previewContainer = document.createElement('div');
    previewContainer.style.position = 'relative';
    previewContainer.style.width = `${width}px`;
    previewContainer.style.height = `${height}px`;
    previewContainer.style.margin = '12px auto';
    previewContainer.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    
    // Create background div
    const bgDiv = document.createElement('div');
    bgDiv.style.position = 'absolute';
    bgDiv.style.left = '0';
    bgDiv.style.top = '0';
    bgDiv.style.width = '100%';
    bgDiv.style.height = '100%';
    bgDiv.style.background = vectorOutput.background;
    previewContainer.appendChild(bgDiv);
    
    // Create and add each layer as an SVG
    vectorOutput.layers.forEach((layer, index) => {
      if (!layer.visible) return;
      
      const svgElem = document.createElementNS(svgNS, 'svg');
      svgElem.setAttribute('width', width.toString());
      svgElem.setAttribute('height', height.toString());
      svgElem.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svgElem.style.position = 'absolute';
      svgElem.style.left = '0';
      svgElem.style.top = '0';
      svgElem.style.width = '100%';
      svgElem.style.height = '100%';
      svgElem.style.zIndex = (index + 1).toString();
      
      // Add each path to the SVG
      layer.paths.forEach(path => {
        const pathElem = document.createElementNS(svgNS, 'path');
        pathElem.setAttribute('d', path.d);
        pathElem.setAttribute('fill', path.fill);
        pathElem.setAttribute('stroke', path.stroke);
        pathElem.setAttribute('stroke-width', path.strokeWidth);
        svgElem.appendChild(pathElem);
      });
      
      previewContainer.appendChild(svgElem);
    });
    
    // Add to vector preview element
    this.vectorPreviewElement.appendChild(previewContainer);
  }

  /**
   * Render cross-hatched vector output
   * This is specifically for pen plotter output with hatching
   */
  renderCrossHatchedPreview(vectorOutput: VectorOutput): void {
    // This extends the regular vector preview with cross-hatching visualization
    this.renderVectorPreview(vectorOutput);
    
    if (!this.vectorPreviewElement) return;
    
    // Add a note about pen plotter compatibility
    const infoNote = document.createElement('div');
    infoNote.style.margin = '10px 0';
    infoNote.style.padding = '8px 12px';
    infoNote.style.backgroundColor = '#f0f9ff';
    infoNote.style.border = '1px solid #bae6fd';
    infoNote.style.borderRadius = '4px';
    infoNote.style.fontSize = '14px';
    infoNote.innerHTML = `
      <strong>Pen Plotter Ready</strong>: Cross-hatching patterns have been generated 
      to create tonal values suitable for pen plotters. Darker tones use denser 
      line patterns.
    `;
    
    this.vectorPreviewElement.appendChild(infoNote);
  }

  /**
   * Hide canvas
   */
  hideCanvas(): void {
    if (this.canvas) {
      this.canvas.style.display = 'none';
    }
  }

  /**
   * Hide vector preview
   */
  hideVectorPreview(): void {
    if (this.vectorPreviewContainer) {
      this.vectorPreviewContainer.style.display = 'none';
    }
  }

  /**
   * Get canvas image data
   */
  getCanvasImageData(): ImageDataModel | null {
    if (!this.canvas || !this.ctx) return null;
    
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    return ImageDataModel.fromCanvasImageData(imageData);
  }

  /**
   * Resize canvas
   */
  resizeCanvas(width: number, height: number): void {
    if (!this.canvas || !this.ctx) return;
    
    // Remember current content
    const prevImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    
    // Resize canvas
    this.canvas.width = width;
    this.canvas.height = height;
    
    // Clear canvas (happens automatically on resize, but being explicit)
    this.ctx.clearRect(0, 0, width, height);
    
    // If there was content, try to preserve it
    if (prevImageData) {
      try {
        this.ctx.putImageData(prevImageData, 0, 0);
      } catch (error) {
        console.error('Error restoring canvas content after resize:', error);
      }
    }
  }
}
