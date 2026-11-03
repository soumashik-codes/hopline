"use client";

import { useId, useState } from "react";
import { Icon } from "@/components/Icon";
import { stopsLabel } from "@/lib/transport/stops";

/** Collapsed-by-default list of the stops between a ride's start and end. */
export function LegStops({ stops, from, to }: { stops: string[]; from: string; to: string }) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  if (stops.length === 0) return null;

  const count = stopsLabel(stops.length);
  return (
    <div className="legstops">
      <button
        type="button"
        className="legstops-btn"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${open ? "Hide" : "Show"} ${count} between ${from} and ${to}`}
        onClick={() => setOpen(!open)}
      >
        {count}
        <Icon name="chevron" small />
      </button>
      <ol id={listId} hidden={!open}>
        {stops.map((stop) => (
          <li key={stop}>{stop}</li>
        ))}
      </ol>
    </div>
  );
}
