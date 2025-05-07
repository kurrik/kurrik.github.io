/**
 * Infrastructure adapter for local storage operations
 */
import { ILocalStorageAdapter } from '../../types/interfaces';

export class LocalStorageAdapter implements ILocalStorageAdapter {
  /**
   * Save data to local storage
   */
  save(key: string, data: any): void {
    try {
      const serializedData = JSON.stringify(data);
      localStorage.setItem(key, serializedData);
    } catch (error) {
      console.error(`Failed to save data for key ${key}:`, error);
    }
  }

  /**
   * Load data from local storage
   */
  load<T>(key: string): T | null {
    try {
      const serializedData = localStorage.getItem(key);
      if (serializedData === null) {
        return null;
      }
      return JSON.parse(serializedData) as T;
    } catch (error) {
      console.error(`Failed to load data for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove data from local storage
   */
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove data for key ${key}:`, error);
    }
  }
}
