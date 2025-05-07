/**
 * Global declarations for the Posterize application
 */

import { PreviewManager } from '../ui/components/preview-manager';
import { LayerPanelManager } from '../ui/components/layer-panel-manager';

declare global {
  interface Window {
    previewManager: PreviewManager;
    layerPanelManager: LayerPanelManager;
    // Add this to tell TypeScript that CV will be available globally once opencv.js loads
    cv: any;
    onOpenCvReady: () => void;
  }
}

export {};
