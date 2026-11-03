"use client";

import { useSyncExternalStore } from "react";

function subscribe(listener: () => void) {
  const id = window.setInterval(listener, 15_000);
  return () => window.clearInterval(id);
}

/** The current minute (ms since epoch, floored), or null during server render. */
export function useNowMinute(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / 60_000) * 60_000,
    () => null,
  );
}

export function formatClock(epochMs: number, addMinutes = 0): string {
  return new Date(epochMs + addMinutes * 60_000).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
