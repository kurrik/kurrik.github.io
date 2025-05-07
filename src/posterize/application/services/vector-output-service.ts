/**
 * Service for managing vector output in the application
 * 
 * This service acts as a centralized store for vector output data
 * and handles communication between UI components like the
 * VectorControlManager and ExportManager.
 */
import { VectorOutput } from '../../types/interfaces';

export class VectorOutputService {
  private currentVectorOutput: VectorOutput | null = null;
  private listeners: ((vectorOutput: VectorOutput) => void)[] = [];
  
  /**
   * Set the current vector output and notify listeners
   */
  setVectorOutput(vectorOutput: VectorOutput): void {
    this.currentVectorOutput = vectorOutput;
    this.notifyListeners();
  }
  
  /**
   * Get the current vector output
   */
  getVectorOutput(): VectorOutput | null {
    return this.currentVectorOutput;
  }
  
  /**
   * Register a listener for vector output changes
   */
  onVectorOutputChange(listener: (vectorOutput: VectorOutput) => void): void {
    this.listeners.push(listener);
    
    // If there's already vector output available, notify the new listener immediately
    if (this.currentVectorOutput) {
      listener(this.currentVectorOutput);
    }
  }
  
  /**
   * Notify all registered listeners of vector output changes
   */
  private notifyListeners(): void {
    if (this.currentVectorOutput) {
      this.listeners.forEach(listener => listener(this.currentVectorOutput!));
    }
  }
  
  /**
   * Update a specific layer's visibility in the current vector output
   */
  updateLayerVisibility(layerId: string, visible: boolean): void {
    if (!this.currentVectorOutput) return;
    
    // Find the layer and update its visibility
    const layer = this.currentVectorOutput.layers.find(l => l.id === layerId);
    if (layer) {
      layer.visible = visible;
      this.notifyListeners();
    }
  }
  
  /**
   * Set visibility for all layers
   */
  setAllLayersVisibility(visible: boolean): void {
    if (!this.currentVectorOutput) return;
    
    // Update all layers' visibility
    this.currentVectorOutput.layers.forEach(layer => {
      layer.visible = visible;
    });
    
    // Notify listeners of the change
    this.notifyListeners();
  }
}
