import { writable } from 'svelte/store';

const DEBUG_MODE_KEY = 'posterizeDebugMode';

let initialDebugMode = false;
if (typeof window !== 'undefined') {
  const saved = localStorage.getItem(DEBUG_MODE_KEY);
  if (saved !== null) {
    initialDebugMode = saved === 'true';
  }
}

export const debugModeStore = writable(initialDebugMode);

debugModeStore.subscribe(value => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DEBUG_MODE_KEY, value ? 'true' : 'false');
  }
});
