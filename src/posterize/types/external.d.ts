/**
 * Type definitions for external libraries used in the Posterize app
 */

// OpenCV.js type definitions
declare namespace cv {
  // Base Types
  class Mat {
    static zeros(rows: number, cols: number, type: number): Mat;
    delete(): void;
    data32S: Int32Array;
    ucharPtr(y: number, x: number): Uint8Array;
  }

  class MatVector {
    size(): number;
    get(index: number): Mat;
    delete(): void;
  }

  // Constants
  const CV_8UC1: number;
  const RETR_TREE: number;
  const CHAIN_APPROX_SIMPLE: number;

  // Functions
  function findContours(
    image: Mat,
    contours: MatVector,
    hierarchy: Mat,
    mode: number,
    method: number,
    offset?: { x: number, y: number }
  ): void;
}

// JSZip type definitions
declare class JSZip {
  constructor();
  file(path: string, content: string | Blob): void;
  generateAsync(options: { type: string }): Promise<Blob>;
}
