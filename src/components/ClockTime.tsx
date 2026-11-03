"use client";

import { formatClock, useNowMinute } from "@/lib/time";

/** Wall-clock time `addMinutes` from now. Rendered on the client only, so server and browser HTML match. */
export function ClockTime({ addMinutes = 0 }: { addMinutes?: number }) {
  const now = useNowMinute();
  return <time>{now == null ? "--:--" : formatClock(now, addMinutes)}</time>;
}
