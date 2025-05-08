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
   * @param vectorOutput The vector output to set, or null to clear the output
   */
  setVectorOutput(vectorOutput: VectorOutput | null): void {
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
   * @param listener A function that handles vector output updates, including null when cleared
   */
  onVectorOutputChange(listener: (vectorOutput: VectorOutput | null) => void): void {
    this.listeners.push(listener);
    
    // Always notify the new listener of the current state, even if null
    // This ensures components have the correct initial state
    listener(this.currentVectorOutput);
  }
  
  /**
   * Notify all registered listeners of vector output changes
   * This method now handles both set and clear (null) operations
   */
  private notifyListeners(): void {
    // Always notify listeners of the current state, even if null
    // This ensures components can properly handle reset events
    this.listeners.forEach(listener => {
      try {
        // We need to handle null case specially
        if (this.currentVectorOutput === null) {
          // For TypeScript compatibility, we need to cast the listener
          (listener as (output: VectorOutput | null) => void)(null);
        } else {
          listener(this.currentVectorOutput);
        }
      } catch (error) {
        console.error('Error notifying vector output listener:', error);
      }
    });
    
    // Also dispatch a custom event for backward compatibility
    const event = new CustomEvent('vectorOutput:changed', { 
      detail: this.currentVectorOutput 
    });
    document.dispatchEvent(event);
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
