/**
 * Debounce utilities for improving UI performance
 */

/**
 * Creates a debounced version of an event handler
 * @param callback The function to debounce
 * @param delay Delay in milliseconds before executing the function
 * @returns A debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 500
): (...args: Parameters<T>) => void {
  let timeoutId: number | null = null;
  
  return function(...args: Parameters<T>): void {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
    
    timeoutId = window.setTimeout(() => {
      callback(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Singleton for debounced event dispatching
 */
class EventDebouncer {
  private debounceTimers: Record<string, number> = {};
  private readonly delay: number = 500; // ms

  /**
   * Dispatch an event with debouncing
   * @param eventName Name of the event to dispatch
   * @param delay Optional custom delay (defaults to 500ms)
   */
  dispatchDebounced(eventName: string, detail?: any, delay?: number): void {
    const actualDelay = delay ?? this.delay;
    
    // Clear any existing timer for this event
    if (this.debounceTimers[eventName]) {
      window.clearTimeout(this.debounceTimers[eventName]);
    }
    
    // Set a new timer
    this.debounceTimers[eventName] = window.setTimeout(() => {
      // Create and dispatch the event
      const event = detail 
        ? new CustomEvent(eventName, { detail }) 
        : new CustomEvent(eventName);
      
      document.dispatchEvent(event);
      this.debounceTimers[eventName] = 0;
    }, actualDelay);
  }
}

// Export singleton instance
export const eventDebouncer = new EventDebouncer();
