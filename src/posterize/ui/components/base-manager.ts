/**
 * Base manager class that implements common functionality
 */
import { AppState } from '../../types/interfaces';
import { StateManagementService } from '../../application/services/state-management-service';
import { IManager } from '../../types/manager-interfaces';

export abstract class BaseManager implements IManager {
  protected elements: {
    [key: string]: HTMLElement | null;
  } = {};

  protected stateManagementService: StateManagementService;
  protected currentState: AppState;

  constructor(stateManagementService: StateManagementService) {
    this.stateManagementService = stateManagementService;
    this.currentState = stateManagementService.getDefaultState();
  }

  /**
   * Initialize DOM element references required by this manager
   */
  public initialize(): void {
    this.initializeElementReferences();
  }

  /**
   * Bind required event listeners
   */
  public abstract bindEvents(): void;

  /**
   * Update controls based on the new state
   */
  public updateControls(state: AppState): void {
    this.currentState = state;
    this.updateControlsInternal();
  }

  /**
   * Initialize element references needed by this manager
   */
  protected abstract initializeElementReferences(): void;

  /**
   * Internal implementation of updateControls
   */
  protected abstract updateControlsInternal(): void;
}
