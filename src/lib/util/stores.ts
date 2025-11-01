// Pulled from a personal project where I used a lot of stores -Aubrey

import { derived, writable, type Readable, type Unsubscriber, type Writable } from "svelte/store";

export function localStore<T extends { toString(): string }>(key: string, value: T, load?: (value: string) => T): CachedWritable<T> & { default: T } {
  // ssr handling
  if (!("localStorage" in globalThis)) return Object.assign(cachedWritable(value), { default: value });
  
  const input = localStorage.getItem(key);
  const store: CachedWritable<T> & { default: T } = Object.assign(cachedWritable(input !== null ? load?.(input) ?? input as unknown as T : value), { default: value });
  store.subscribe(value => localStorage.setItem(key, value.toString()));
  return store;
}

export const parseBoolean = (value: string) => value == "true";

export function loadFromStorage(keys: Record<string, { value: any, load?: (value: string) => any }>) {
  for (const key in keys) {
    const input = localStorage.getItem(key);
    if (input !== null)
      keys[key].value = keys[key].load?.(input) ?? input;
  }
}

/** One or more `Readable`s. */
type Stores = Readable<any> | [Readable<any>, ...Array<Readable<any>>] | Array<Readable<any>>;

/** One or more values from `Readable` stores. */
type StoresValues<T> =
  T extends Readable<infer U> ? U : { [K in keyof T]: T[K] extends Readable<infer U> ? U : never };

export type Cached<T> = Readable<T> & { value: T };
/**
 * Caches the value of a store for later access.
 */
export function cached<S extends Stores, T>(stores: S, updater: (values: StoresValues<S>) => T) {
  let store: Cached<T> = derived(stores, updater) as any;
  store.subscribe((value) => store.value = value);
  return store
}

export type CachedWritable<T> = Writable<T> & { value: T };

export function cachedWritable<T>(initial: T): CachedWritable<T> {
  const store: CachedWritable<T> = writable(initial) as any;
  store.subscribe(value => store.value = value);
  return store;
}

export function subscribe<S extends Stores>(stores: S, subscriber: (values: StoresValues<S>) => void): Unsubscriber {
  return derived(stores, value => value).subscribe(subscriber);
}
