/**
 * Application service for managing application state
 */
import {
  IStateManagementService,
  AppState,
  ILocalStorageAdapter
} from '../../types/interfaces';
import { PosterizeSettingsModel } from '../../domain/models/posterize-settings';
import { VectorSettingsModel } from '../../domain/models/vector-settings';

export class StateManagementService implements IStateManagementService {
  private readonly STORAGE_KEY = 'posterizeAppState';
  private storageAdapter: ILocalStorageAdapter;

  constructor(storageAdapter: ILocalStorageAdapter) {
    this.storageAdapter = storageAdapter;
  }

  /**
   * Save application state to storage
   */
  saveState(state: AppState): void {
    try {
      this.storageAdapter.save(this.STORAGE_KEY, state);
    } catch (error) {
      console.error('Failed to save application state:', error);
    }
  }

  /**
   * Load application state from storage
   */
  loadState(): AppState | null {
    try {
      const savedState = this.storageAdapter.load<Partial<AppState>>(this.STORAGE_KEY);
      
      if (!savedState) {
        return null;
      }

      // Create proper model instances from saved data
      return {
        posterizeSettings: PosterizeSettingsModel.fromObject(
          savedState.posterizeSettings || {}
        ),
        
        cropSettings: savedState.cropSettings || {
          aspectRatio: '1:1',
          mode: 'crop'
        },
        
        vectorSettings: VectorSettingsModel.fromObject(
          savedState.vectorSettings || {}
        ),
        
        crossHatchingSettings: savedState.crossHatchingSettings || {
          enabled: false,
          density: 5,
          angle: 45,
          lineWidth: 0.5
        },
        
        originalImageDataUrl: savedState.originalImageDataUrl
      };
    } catch (error) {
      console.error('Failed to load application state:', error);
      return null;
    }
  }

  /**
   * Get default application state
   */
  getDefaultState(): AppState {
    return {
      posterizeSettings: new PosterizeSettingsModel(),
      cropSettings: {
        aspectRatio: '1:1',
        mode: 'crop'
      },
      vectorSettings: new VectorSettingsModel(),
      crossHatchingSettings: {
        enabled: false,
        density: 5,
        angle: 45,
        lineWidth: 0.5
      }
    };
  }
}
