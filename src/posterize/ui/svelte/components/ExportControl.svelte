<script lang="ts">
  /// <reference path="../types.d.ts" />
  /**
   * ExportControl Component
   * 
   * Provides UI for exporting SVG in the posterize app.
   * Replaces the ExportManager while maintaining DDD principles.
   */
  import { onMount, getContext } from 'svelte';
  import { StateManagementService } from '../../../application/services/state-management-service';
  import { VectorOutputService } from '../../../application/services/vector-output-service';
  import type { VectorOutput } from '../../../types/interfaces';
  
  // Get services from context (injected by parent)
  interface Services {
    stateService: StateManagementService;
    vectorService: VectorOutputService;
  }
  const services = getContext<Services>('services');
  const { stateService, vectorService } = services;
  
  // Local state
  let hasVectorOutput = false;
  
  // Update hasVectorOutput when vector output changes
  function onVectorOutputChange(vectorOutput: VectorOutput | null) {
    hasVectorOutput = !!vectorOutput;
  }
  
  /**
   * Download SVG as a file
   */
  function downloadSvgFile(): void {
    try {
      const vectorOutput = vectorService.getVectorOutput();
      if (!vectorOutput) {
        alert('No vector preview available.');
        return;
      }
      
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
      a.href = url;
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
  async function downloadLayersAsZip(): Promise<void> {
    try {
      const vectorOutput = vectorService.getVectorOutput();
      if (!vectorOutput) {
        alert('No vector preview available.');
        return;
      }
      
      // Declare JSZip as any to avoid TypeScript errors with the global JSZip library
      const JSZip = (window as any).JSZip;
      if (!JSZip) {
        alert('JSZip library not loaded. Cannot create ZIP file.');
        return;
      }
      
      const zip = new JSZip();
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
      a.href = url;
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
  
  // Initialize component
  onMount(() => {
    // Set up a handler for vector output changes
    const handleVectorOutputChange = (output: VectorOutput) => {
      console.log('ExportControl: Vector output updated', output);
      onVectorOutputChange(output);
    };
    
    // Subscribe to vector output changes using the service's subscription method
    vectorService.onVectorOutputChange(handleVectorOutputChange);
    
    // Check if there's already a vector output
    const currentOutput = vectorService.getVectorOutput();
    console.log('ExportControl: Initial vector output state:', currentOutput ? 'available' : 'not available');
    hasVectorOutput = !!currentOutput;
    
    // No need for cleanup as Svelte will handle component destruction
  });
</script>

<div class="export-controls">
  <div class="export-buttons">
    <button 
      class="export-button svg-btn" 
      on:click={downloadSvgFile}
      disabled={!hasVectorOutput}
    >
      Download SVG
    </button>
    
    <button 
      class="export-button zip-btn" 
      on:click={downloadLayersAsZip}
      disabled={!hasVectorOutput}
    >
      Download Layers (ZIP)
    </button>
  </div>
</div>

<style>
  .export-controls {
    width: 100%;
    margin-top: 15px;
  }
  
  .export-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
  }
  
  .export-button {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    color: white;
    font-weight: 500;
    transition: background-color 0.2s;
  }
  
  .export-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .svg-btn {
    background-color: #3b82f6;
  }
  
  .svg-btn:hover:not(:disabled) {
    background-color: #2563eb;
  }
  
  .zip-btn {
    background-color: #10b981;
  }
  
  .zip-btn:hover:not(:disabled) {
    background-color: #059669;
  }
</style>
