"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { isPlace } from "@/lib/places";
import type { Place } from "@/lib/transport/types";

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
  /** The full place the user chose, not just its name. Null until they set it. */
  home: Place | null;
  work: Place | null;
  routes: SavedTrip[];
}

const EMPTY_SAVED: SavedPlaces = { home: null, work: null, routes: [] };

const MAX_RECENTS = 6;

function isTrip(value: unknown): value is SavedTrip {
  const t = value as Record<string, unknown> | null;
  return typeof t?.from === "string" && typeof t.to === "string";
}

/** Earlier versions stored Home and Work as plain names. Those have no coordinates, so they are dropped, not guessed. */
function readSaved(raw: unknown): SavedPlaces {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    home: isPlace(r.home) ? r.home : null,
    work: isPlace(r.work) ? r.work : null,
    routes: Array.isArray(r.routes) ? r.routes.filter(isTrip) : [],
  };
}

export function useSaved(): [SavedPlaces, (value: SavedPlaces) => void] {
  const [raw, setRaw] = useStored<unknown>("saved", EMPTY_SAVED);
  const saved = useMemo(() => readSaved(raw), [raw]);
  return [saved, setRaw];
}

const NO_RECENTS: unknown[] = [];

/** Places the user has picked as a destination, newest first. Only places they chose are ever stored. */
export function useRecents(): [Place[], (place: Place) => void] {
  const [raw, setRaw] = useStored<unknown[]>("recents", NO_RECENTS);
  const recents = useMemo(() => (Array.isArray(raw) ? raw.filter(isPlace) : []), [raw]);
  const add = useCallback(
    (place: Place) => setRaw([place, ...recents.filter((p) => p.id !== place.id)].slice(0, MAX_RECENTS)),
    [recents, setRaw],
  );
  return [recents, add];
}
