/**
 * Global declarations for the Posterize application
 */

import { VectorOutput } from './interfaces';

declare global {
  interface Window {
    previewManager?: {
      renderVectorPreview: (vectorOutput: VectorOutput) => void;
      getVectorOutput: () => VectorOutput | null;
    };
    layerPanelManager?: {
      createLayerControls: (vectorOutput: VectorOutput) => void;
    };
    // Add this to tell TypeScript that CV will be available globally once opencv.js loads
    cv: any;
    onOpenCvReady: () => void;
  }
}

export {};
