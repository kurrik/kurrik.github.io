/**
 * Type declarations for Svelte
 * 
 * This is a temporary file to support TypeScript compilation without the actual
 * Svelte dependencies installed. These will be replaced by proper types when
 * Svelte dependencies are installed.
 */

declare module 'svelte' {
  export function onMount(callback: () => void | (() => void)): void;
  export function onDestroy(callback: () => void): void;
  export function createEventDispatcher<T = any>(): (type: string, detail?: T) => void;
  export function tick(): Promise<void>;
  export function setContext<T>(key: any, context: T): T;
  export function getContext<T>(key: any): T;
}

declare module 'svelte/store' {
  export interface Readable<T> {
    subscribe(run: (value: T) => void): () => void;
  }
  
  export interface Writable<T> extends Readable<T> {
    set(value: T): void;
    update(updater: (value: T) => T): void;
  }
  
  export function writable<T>(value: T): Writable<T>;
  export function readable<T>(value: T, start?: (set: (value: T) => void) => () => void): Readable<T>;
  export function derived<T, U>(stores: Readable<T>, fn: (value: T) => U): Readable<U>;
  export function get<T>(store: Readable<T>): T;
}

declare module '*.svelte' {
  import { SvelteComponentDev } from 'svelte/internal';
  export default SvelteComponentDev;
}
