"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  readStore,
  subscribeStore,
  updateStore,
  writeStore,
  type StorageSchema,
} from "@/lib/storage/store";

export type SetLocalStorage<T> = (next: T | ((current: T) => T)) => void;

/**
 * SSR-safe localStorage binding.
 *
 * During server rendering (and the hydration pass) the schema fallback is used,
 * so markup matches; React then re-renders with the real stored value. Writes
 * broadcast to every hook bound to the same key, in this tab and across tabs.
 */
export function useLocalStorage<T>(schema: StorageSchema<T>): [T, SetLocalStorage<T>] {
  const value = useSyncExternalStore(
    useCallback((onChange) => subscribeStore(schema.key, onChange), [schema.key]),
    useCallback(() => readStore(schema), [schema]),
    useCallback(() => schema.fallback, [schema]),
  );

  const setValue = useCallback<SetLocalStorage<T>>(
    (next) => {
      if (typeof next === "function") {
        updateStore(schema, next as (current: T) => T);
      } else {
        writeStore(schema, next);
      }
    },
    [schema],
  );

  return [value, setValue];
}

/** True once the component has mounted in the browser. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
