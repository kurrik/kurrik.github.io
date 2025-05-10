<script lang="ts">
  import { writable } from 'svelte/store';
  import { onDestroy } from 'svelte';

  // Use a dedicated store for debugMode
  export const debugModeStore = writable(false);

  let debugMode = false;
  const unsubscribe = debugModeStore.subscribe(value => {
    debugMode = value;
  });

  function toggleDebugMode() {
    debugModeStore.set(!debugMode);
  }

  onDestroy(unsubscribe);
</script>

<div class="debug-control">
  <label class="debug-label">
    <input 
      type="checkbox"
      bind:checked={debugMode}
      on:change={toggleDebugMode}
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
