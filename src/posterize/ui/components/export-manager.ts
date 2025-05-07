/**
 * Manager for export operations
 */
import { BaseManager } from './base-manager';
import { IExportManager } from '../../types/manager-interfaces';
import { VectorOutput } from '../../types/interfaces';
import { StateManagementService } from '../../application/services/state-management-service';

export class ExportManager extends BaseManager implements IExportManager {
  constructor(stateManagementService: StateManagementService) {
    super(stateManagementService);
  }

  /**
   * Initialize element references
   */
  protected initializeElementReferences(): void {
    this.elements = {
      downloadSvgBtn: document.getElementById('downloadSvgBtn'),
      downloadZipBtn: document.getElementById('downloadZipBtn')
    };
  }

  /**
   * Bind export-related events
   */
  public bindEvents(): void {
    // Buttons will be bound when vector preview is generated
  }

  /**
   * Update export controls
   */
  protected updateControlsInternal(): void {
    // No specific controls to update
  }

  /**
   * Download SVG as a file
   */
  public downloadSvgFile(vectorOutput: VectorOutput): void {
    try {
      const { width, height } = vectorOutput.dimensions;
      let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
`;

      // Add background if needed
      svgContent += `<rect width="100%" height="100%" fill="${vectorOutput.background}" />\n`;

      // Add all visible layers
      vectorOutput.layers.forEach(layer => {
        if (layer.visible) {
          layer.paths.forEach(path => {
            svgContent += `  <path d="${path.d}" fill="${path.fill}" stroke="${path.stroke}" stroke-width="${path.strokeWidth}" />\n`;
          });
        }
      });

      svgContent += '</svg>';

      // Create download link
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = 'posterized.svg';
      document.body.appendChild(a);
      a.click();

      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('Error downloading SVG:', error);
      alert('Failed to download SVG. See console for details.');
    }
  }

  /**
   * Download all layers as a ZIP file
   */
  public async downloadLayersAsZip(vectorOutput: VectorOutput): Promise<void> {
    try {
      if (!window.JSZip) {
        alert('JSZip library not loaded. Cannot create ZIP file.');
        return;
      }

      const zip = new window.JSZip();
      const { width, height } = vectorOutput.dimensions;

      // Add background layer
      const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${vectorOutput.background}"/></svg>`;
      zip.file('layer_background.svg', bgSvg);

      // Add each visible layer
      vectorOutput.layers.forEach((layer, i) => {
        if (!layer.visible) return;

        // Create SVG for this layer
        let layerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n`;

        layer.paths.forEach(path => {
          layerSvg += `<path d="${path.d}" fill="${path.fill}" `;
          if (path.stroke) layerSvg += `stroke="${path.stroke}" `;
          if (path.strokeWidth) layerSvg += `stroke-width="${path.strokeWidth}" `;
          layerSvg += '/>\n';
        });

        layerSvg += '</svg>';
        zip.file(`layer_${i + 1}.svg`, layerSvg);
      });

      // Generate and download ZIP
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = 'posterize_layers.zip';
      document.body.appendChild(a);
      a.click();

      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('Error creating ZIP file:', error);
      alert('Failed to create ZIP file. See console for details.');
    }
  }
}
