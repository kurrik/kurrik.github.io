/**
 * Infrastructure adapter for OpenCV.js operations
 */
import { IOpenCVAdapter } from '../../types/interfaces';

export class OpenCVAdapter implements IOpenCVAdapter {
  private ready: boolean = false;

  constructor() {
    // Check if OpenCV is already loaded
    if (typeof cv !== 'undefined') {
      this.ready = true;
    } else {
      // Listen for OpenCV.js to load (it's loaded asynchronously)
      document.addEventListener('opencv-loaded', () => {
        this.ready = true;
      });
      
      // Manually add a listener to the window object for when OpenCV.js loads
      window.addEventListener('load', () => {
        if (typeof cv !== 'undefined') {
          this.ready = true;
        }
      });
    }
  }

  /**
   * Check if OpenCV.js is ready to use
   */
  isReady(): boolean {
    return this.ready && typeof cv !== 'undefined';
  }

  /**
   * Find contours in a binary mask
   */
  findContours(mask: any): { contours: any, hierarchy: any } {
    if (!this.isReady()) {
      throw new Error('OpenCV.js is not ready');
    }

    try {
      // Create output matrices for contours and hierarchy
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      
      // Find contours with hierarchy
      cv.findContours(
        mask,
        contours,
        hierarchy,
        cv.RETR_TREE,
        cv.CHAIN_APPROX_SIMPLE
      );
      
      return { contours, hierarchy };
    } catch (error) {
      console.error('Error finding contours:', error);
      throw error;
    }
  }

  /**
   * Create a zeros matrix with specified dimensions
   */
  createMask(width: number, height: number): any {
    if (!this.isReady()) {
      throw new Error('OpenCV.js is not ready');
    }
    
    return cv.Mat.zeros(height, width, cv.CV_8UC1);
  }

  /**
   * Clean up OpenCV resources to prevent memory leaks
   */
  dispose(resources: any[]): void {
    if (!this.isReady()) {
      return;
    }
    
    resources.forEach(resource => {
      if (resource && typeof resource.delete === 'function') {
        try {
          resource.delete();
        } catch (error) {
          console.error('Error disposing OpenCV resource:', error);
        }
      }
    });
  }
}
