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
  
  // Add SvelteComponentTyped for proper component typing
  export class SvelteComponentTyped<Props = {}, Events = {}, Slots = {}> {
    $$prop_def: Props;
    $$events_def: Events;
    $$slot_def: Slots;
    $on<K extends keyof Events & string>(type: K, callback: (e: Events[K]) => void): () => void;
    $set(props?: Partial<Props>): void;
    constructor(options: { target: Element; props?: Props; });
  }
  
  // Basic SvelteComponent type
  export class SvelteComponent extends SvelteComponentTyped {}
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
  export function derived<T, U>(stores: Readable<T> | Readable<T>[], fn: (value: T) => U): Readable<U>;
  export function get<T>(store: Readable<T>): T;
}

// Component type definitions for our Svelte components
declare module './components/ImageLoader.svelte' {
  import { SvelteComponentTyped } from 'svelte';
  
  export interface ImageLoaderProps {}
  export interface ImageLoaderEvents {
    imageLoaded: CustomEvent<{ imageData: any }>;
  }
  
  export default class ImageLoader extends SvelteComponentTyped<ImageLoaderProps, ImageLoaderEvents> {
    // Component methods accessible through refs
    getCurrentImageData(): any;
    processCurrentImage(): void;
    loadImageFromUrlExposed(url: string): void;
  }
}

declare module './components/ColorControl.svelte' {
  import { SvelteComponentTyped } from 'svelte';
  export default class ColorControl extends SvelteComponentTyped<{}, {}> {}
}

declare module './components/NoiseControl.svelte' {
  import { SvelteComponentTyped } from 'svelte';
  export default class NoiseControl extends SvelteComponentTyped<{}, {}> {}
}

declare module './components/SmoothingControl.svelte' {
  import { SvelteComponentTyped } from 'svelte';
  export default class SmoothingControl extends SvelteComponentTyped<{}, {}> {}
}

declare module './components/BorderControl.svelte' {
  import { SvelteComponentTyped } from 'svelte';
  export default class BorderControl extends SvelteComponentTyped<{}, {}> {}
}

declare module './components/CropControl.svelte' {
  import { SvelteComponentTyped } from 'svelte';
  export default class CropControl extends SvelteComponentTyped<{}, {}> {}
}

declare module './components/VectorControl.svelte' {
  import { SvelteComponentTyped } from 'svelte';
  export default class VectorControl extends SvelteComponentTyped<{}, {}> {}
}

declare module './components/ExportControl.svelte' {
  import { SvelteComponentTyped } from 'svelte';
  export default class ExportControl extends SvelteComponentTyped<{}, {}> {}
}

// Default export for any Svelte component
declare module '*.svelte' {
  import { SvelteComponentTyped } from 'svelte';
  export default SvelteComponentTyped;
}
