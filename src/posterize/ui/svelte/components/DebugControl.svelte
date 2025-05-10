<script lang="ts">
  import { writable } from 'svelte/store';
  import { onDestroy } from 'svelte';

  // Key for localStorage
  const DEBUG_MODE_KEY = 'posterizeDebugMode';

  // Initialize from localStorage if present
  let initialDebugMode = false;
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(DEBUG_MODE_KEY);
    if (saved !== null) {
      initialDebugMode = saved === 'true';
    }
  }

  export const debugModeStore = writable(initialDebugMode);

  let debugMode = initialDebugMode;
  const unsubscribe = debugModeStore.subscribe(value => {
    debugMode = value;
    if (typeof window !== 'undefined') {
      localStorage.setItem(DEBUG_MODE_KEY, value ? 'true' : 'false');
    }
  });

  // Reactively update the store when debugMode changes via the checkbox
  $: debugModeStore.set(debugMode);

  onDestroy(unsubscribe);
</script>

<div class="debug-control">
  <label class="debug-label">
    <input 
      type="checkbox"
      bind:checked={debugMode}
    />
    Debug Mode
  </label>
  <div class="debug-description">Shows colored outlines for holes (red) and islands (green)</div>
</div>

<style>
  .debug-control {
    margin-top: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .debug-label {
    display: flex;
    align-items: center;
    cursor: pointer;
    user-select: none;
    font-size: 14px;
  }
  .debug-label input {
    margin-right: 6px;
  }
  .debug-description {
    margin-top: 4px;
    font-size: 12px;
    color: #666;
    text-align: center;
  }
</style>
