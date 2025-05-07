/**
 * Domain model for image data
 */
import { ImageData, ImageDimensions, RGBAPixel } from '../../types/interfaces';

export class ImageDataModel implements ImageData {
  dimensions: ImageDimensions;
  pixels: Uint8ClampedArray;
  metadata?: Record<string, any>;

  constructor(
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
    metadata?: Record<string, any>
  ) {
    this.pixels = pixels;
    this.dimensions = { width, height };
    this.metadata = metadata;
  }

  /**
   * Creates an ImageDataModel from a canvas ImageData object
   */
  static fromCanvasImageData(imageData: globalThis.ImageData): ImageDataModel {
    return new ImageDataModel(
      imageData.data,
      imageData.width,
      imageData.height
    );
  }

  /**
   * Converts to a canvas ImageData object
   */
  toCanvasImageData(): globalThis.ImageData {
    return new globalThis.ImageData(
      this.pixels,
      this.dimensions.width,
      this.dimensions.height
    );
  }

  /**
   * Gets a pixel at the specified coordinates
   */
  getPixel(x: number, y: number): RGBAPixel {
    const index = (y * this.dimensions.width + x) * 4;
    return {
      r: this.pixels[index],
      g: this.pixels[index + 1],
      b: this.pixels[index + 2],
      a: this.pixels[index + 3]
    };
  }

  /**
   * Sets a pixel at the specified coordinates
   */
  setPixel(x: number, y: number, pixel: RGBAPixel): void {
    const index = (y * this.dimensions.width + x) * 4;
    this.pixels[index] = pixel.r;
    this.pixels[index + 1] = pixel.g;
    this.pixels[index + 2] = pixel.b;
    this.pixels[index + 3] = pixel.a;
  }

  /**
   * Calculate the luminance for a pixel
   */
  getLuminance(x: number, y: number): number {
    const pixel = this.getPixel(x, y);
    return 0.299 * pixel.r + 0.587 * pixel.g + 0.114 * pixel.b;
  }

  /**
   * Create a copy of the image data
   */
  clone(): ImageDataModel {
    return new ImageDataModel(
      new Uint8ClampedArray(this.pixels),
      this.dimensions.width,
      this.dimensions.height,
      this.metadata ? { ...this.metadata } : undefined
    );
  }
}
