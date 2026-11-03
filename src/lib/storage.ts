"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

// Per-browser storage for recents and saved places/trips. Values are prefixed "hopline:".

const PREFIX = "hopline:";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

/** Reads and writes a JSON value in localStorage. Renders `fallback` on the server and first paint. */
export function useStored<T>(key: string, fallback: T): [T, (value: T) => void] {
  const raw = useSyncExternalStore(subscribe, () => readRaw(key), () => null);
  const value = useMemo(() => {
    if (raw == null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }, [raw, fallback]);
  const setValue = useCallback(
    (next: T) => {
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify(next));
      } catch {
        // Storage can be unavailable (private mode, blocked); the app still works without it.
      }
      listeners.forEach((l) => l());
    },
    [key],
  );
  return [value, setValue];
}

export interface SavedTrip {
  from: string;
  to: string;
}

export interface SavedPlaces {
  home: string;
  work: string;
  routes: SavedTrip[];
}

export const DEFAULT_SAVED: SavedPlaces = {
  home: "Preston Road",
  work: "University of Westminster",
  routes: [],
};

export const DEFAULT_RECENTS: string[] = ["Great Portland Street", "Wembley Stadium", "Oxford Circus"];

export function useSaved() {
  return useStored<SavedPlaces>("saved", DEFAULT_SAVED);
}

export function useRecents() {
  return useStored<string[]>("recents", DEFAULT_RECENTS);
}
