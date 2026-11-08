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
