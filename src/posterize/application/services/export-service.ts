/**
 * Application service for exporting vector graphics
 */
import {
  IExportService,
  VectorOutput,
  IFileSystemAdapter
} from '../../types/interfaces';

export class ExportService implements IExportService {
  private fileSystemAdapter: IFileSystemAdapter;

  constructor(fileSystemAdapter: IFileSystemAdapter) {
    this.fileSystemAdapter = fileSystemAdapter;
  }

  /**
   * Export vector output as an SVG string
   */
  exportSvg(vectorOutput: VectorOutput): string {
    const { width, height } = vectorOutput.dimensions;
    
    // Start the SVG document
    let svgParts = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
    ];
    
    // Add background if specified
    if (vectorOutput.background) {
      svgParts.push(`<rect width="${width}" height="${height}" fill="${vectorOutput.background}" />`);
    }
    
    // Add each visible layer's paths
    vectorOutput.layers.forEach(layer => {
      if (layer.visible) {
        layer.paths.forEach(path => {
          svgParts.push(
            `<path d="${path.d}" fill="${path.fill}" stroke="${path.stroke}" stroke-width="${path.strokeWidth}" />`
          );
        });
      }
    });
    
    // Close the SVG document
    svgParts.push('</svg>');
    
    return svgParts.join('\n');
  }

  /**
   * Export vector output as a downloadable SVG file
   */
  downloadSvg(vectorOutput: VectorOutput, filename: string = 'posterized.svg'): void {
    const svgContent = this.exportSvg(vectorOutput);
    const { url } = this.fileSystemAdapter.createDownloadableBlob(svgContent, 'image/svg+xml');
    this.fileSystemAdapter.triggerDownload(url, filename);
  }

  /**
   * Export all layers as separate SVG files in a ZIP archive
   */
  async exportLayersAsZip(vectorOutput: VectorOutput): Promise<Blob> {
    // This is a placeholder implementation
    // In a real implementation, we would use JSZip to create a zip file
    // containing individual SVG files for each layer
    
    const { width, height } = vectorOutput.dimensions;
    const svgHeader = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
    const svgFooter = '</svg>';
    
    // Create a mock zip object (this will be replaced by actual JSZip usage)
    const zipContent = new Blob(['ZIP content placeholder'], { type: 'application/zip' });
    
    // In the real implementation:
    // 1. Create a new JSZip instance
    // 2. Add background layer if needed
    // 3. Add each visible layer as a separate SVG file
    // 4. Generate and return the ZIP blob
    
    return zipContent;
  }
  
  /**
   * Export vector output as a downloadable ZIP file containing separate SVG layers
   */
  async downloadLayersZip(vectorOutput: VectorOutput, filename: string = 'posterize_layers.zip'): Promise<void> {
    const zipBlob = await this.exportLayersAsZip(vectorOutput);
    const url = URL.createObjectURL(zipBlob);
    this.fileSystemAdapter.triggerDownload(url, filename);
  }
}
