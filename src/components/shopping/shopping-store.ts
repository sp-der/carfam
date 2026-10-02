"use client";

import { useSyncExternalStore } from "react";

/**
 * Saved vehicles and comparison list, stored on this device only (no customer accounts in the demo).
 * Values are public route ids. Storage can be unavailable (private mode), so every access is guarded.
 */

export type ListName = "saved" | "compare";
export const COMPARE_LIMIT = 3;

const KEYS: Record<ListName, string> = { saved: "carfam:saved:v1", compare: "carfam:compare:v1" };
const EMPTY: readonly string[] = Object.freeze([]);

const cache = new Map<ListName, readonly string[]>();
const listeners = new Set<() => void>();

function read(name: ListName): readonly string[] {
  const cached = cache.get(name);
  if (cached) return cached;
  let value: readonly string[] = EMPTY;
  try {
    const raw = window.localStorage.getItem(KEYS[name]);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) value = parsed.filter((x): x is string => typeof x === "string").slice(0, 50);
  } catch {
    value = EMPTY;
  }
  cache.set(name, value);
  return value;
}

function write(name: ListName, next: readonly string[]) {
  cache.set(name, next);
  try {
    window.localStorage.setItem(KEYS[name], JSON.stringify(next));
  } catch {
    // Storage blocked: keep the in-memory value for this visit.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEYS.saved || e.key === KEYS.compare) {
      cache.clear();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useList(name: ListName): readonly string[] {
  return useSyncExternalStore(
    subscribe,
    () => read(name),
    () => EMPTY,
  );
}

/** Toggle membership. Returns false when the compare list is full and nothing was added. */
export function toggleInList(name: ListName, routeId: string): boolean {
  const current = read(name);
  if (current.includes(routeId)) {
    write(name, current.filter((id) => id !== routeId));
    return true;
  }
  if (name === "compare" && current.length >= COMPARE_LIMIT) return false;
  write(name, [...current, routeId]);
  return true;
}

export function removeFromList(name: ListName, routeIds: readonly string[]) {
  write(name, read(name).filter((id) => !routeIds.includes(id)));
}

/** Empty a list; returns what was removed so the caller can offer Undo. */
export function clearList(name: ListName): readonly string[] {
  const previous = read(name);
  write(name, EMPTY);
  return previous;
}

export function restoreList(name: ListName, ids: readonly string[]) {
  write(name, ids);
}
