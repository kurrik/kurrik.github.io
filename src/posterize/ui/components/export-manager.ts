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
   * Initialize element references and create UI controls
   */
  protected initializeElementReferences(): void {
    // Get containers
    const exportButtonsContainer = document.getElementById('exportButtonsContainer');
    const actionButtonsContainer = document.getElementById('actionButtonsContainer');
    
    // Initialize elements references
    this.elements = {
      exportButtonsContainer,
      actionButtonsContainer
    };
    
    // Create reset button in action buttons container
    if (actionButtonsContainer) {
      this.createResetButton(actionButtonsContainer);
    }
    
    // Create export buttons
    if (exportButtonsContainer) {
      this.createExportButtons(exportButtonsContainer);
    }
  }
  
  /**
   * Create reset button
   */
  private createResetButton(container: HTMLElement): void {
    const resetBtn = document.createElement('button');
    resetBtn.id = 'resetBtn';
    resetBtn.className = 'action-button';
    resetBtn.textContent = 'Reset';
    resetBtn.style.backgroundColor = '#ef4444';
    resetBtn.style.color = 'white';
    resetBtn.style.padding = '8px 12px';
    resetBtn.style.border = 'none';
    resetBtn.style.borderRadius = '4px';
    resetBtn.style.cursor = 'pointer';
    
    container.appendChild(resetBtn);
    
    // Store reference
    this.elements.resetBtn = resetBtn;
  }
  
  /**
   * Create export buttons
   */
  private createExportButtons(container: HTMLElement): void {
    // Create download SVG button
    const downloadSvgBtn = document.createElement('button');
    downloadSvgBtn.id = 'downloadSvgBtn';
    downloadSvgBtn.className = 'export-button';
    downloadSvgBtn.textContent = 'Download SVG';
    downloadSvgBtn.style.backgroundColor = '#3b82f6';
    downloadSvgBtn.style.color = 'white';
    downloadSvgBtn.style.padding = '8px 12px';
    downloadSvgBtn.style.margin = '0 5px';
    downloadSvgBtn.style.border = 'none';
    downloadSvgBtn.style.borderRadius = '4px';
    downloadSvgBtn.style.cursor = 'pointer';
    
    // Create download layers as ZIP button
    const downloadZipBtn = document.createElement('button');
    downloadZipBtn.id = 'downloadZipBtn';
    downloadZipBtn.className = 'export-button';
    downloadZipBtn.textContent = 'Download Layers (ZIP)';
    downloadZipBtn.style.backgroundColor = '#10b981';
    downloadZipBtn.style.color = 'white';
    downloadZipBtn.style.padding = '8px 12px';
    downloadZipBtn.style.margin = '0 5px';
    downloadZipBtn.style.border = 'none';
    downloadZipBtn.style.borderRadius = '4px';
    downloadZipBtn.style.cursor = 'pointer';
    
    // Append buttons to container
    container.appendChild(downloadSvgBtn);
    container.appendChild(downloadZipBtn);
    
    // Store references
    this.elements.downloadSvgBtn = downloadSvgBtn;
    this.elements.downloadZipBtn = downloadZipBtn;
    
    // Bind events immediately
    this.bindExportButtonEvents();
  }

  /**
   * Bind export-related events
   */
  public bindEvents(): void {
    this.bindExportButtonEvents();
  }
  
  /**
   * Bind events to export buttons
   */
  private bindExportButtonEvents(): void {
    const { downloadSvgBtn, downloadZipBtn } = this.elements;
    
    if (downloadSvgBtn) {
      downloadSvgBtn.addEventListener('click', () => {
        // Check if we have vector output from preview manager
        if (window.previewManager && window.previewManager.getVectorOutput) {
          const vectorOutput = window.previewManager.getVectorOutput();
          if (vectorOutput) {
            this.downloadSvgFile(vectorOutput);
          } else {
            alert('No vector preview available. Generate a preview first.');
          }
        }
      });
    }
    
    if (downloadZipBtn) {
      downloadZipBtn.addEventListener('click', () => {
        // Check if we have vector output from preview manager
        if (window.previewManager && window.previewManager.getVectorOutput) {
          const vectorOutput = window.previewManager.getVectorOutput();
          if (vectorOutput) {
            this.downloadLayersAsZip(vectorOutput);
          } else {
            alert('No vector preview available. Generate a preview first.');
          }
        }
      });
    }
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
