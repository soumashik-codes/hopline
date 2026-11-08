"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { CURRENT_LOCATION, routesHref } from "@/lib/journey";
import { useSaved } from "@/lib/storage";
import { useNowMinute } from "@/lib/time";

export function Greeting() {
  const now = useNowMinute();
  let greet = "Hello.";
  if (now != null) {
    const h = new Date(now).getHours();
    greet = h >= 5 && h < 12 ? "Morning." : h >= 12 && h < 18 ? "Afternoon." : "Evening.";
  }
  return (
    <h1 className="hello" tabIndex={-1}>
      {greet}
      <br />
      Where to?
    </h1>
  );
}

// Theme: follows the system until the user toggles, then sets data-theme on <html> (as in the prototype).
const themeListeners = new Set<() => void>();
function subscribeTheme(listener: () => void) {
  themeListeners.add(listener);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", listener);
  return () => {
    themeListeners.delete(listener);
    mq.removeEventListener("change", listener);
  };
}
function isDarkNow() {
  return getComputedStyle(document.documentElement).colorScheme === "dark";
}

export function MapButtons() {
  const toast = useToast();
  const dark = useSyncExternalStore(subscribeTheme, isDarkNow, () => false);
  return (
    <>
      <button
        type="button"
        className="mapbtn"
        style={{ left: 14 }}
        aria-label="Dark mode"
        aria-pressed={dark}
        onClick={() => {
          document.documentElement.dataset.theme = dark ? "light" : "dark";
          themeListeners.forEach((l) => l());
        }}
      >
        <Icon name="sun" />
      </button>
      <button
        type="button"
        className="mapbtn"
        style={{ right: 14 }}
        aria-label="Centre map on my location"
        onClick={() => toast("Showing your location")}
      >
        <Icon name="locate" />
      </button>
    </>
  );
}

export function QuickPlaces() {
  const [saved] = useSaved();
  return (
    <div className="quick">
      {(
        [
          { slot: "home", label: "Home" },
          { slot: "work", label: "Work" },
        ] as const
      ).map(({ slot, label }) => {
        const place = saved[slot];
        return (
          <Link key={slot} href={place ? routesHref(CURRENT_LOCATION, place.name) : `/search?set=${slot}`}>
            <Icon name={slot} />
            <span>
              <b>{label}</b>
              <small>{place ? place.name : `Set ${label.toLowerCase()}`}</small>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

const MODES: [string, string, IconName][] = [
  ["all", "All", "step"],
  ["tube", "Tube", "tube"],
  ["bus", "Bus", "bus"],
  ["rail", "Rail", "rail"],
  ["bike", "Cycle", "bike"],
  ["walk", "Walk", "walk"],
  ["cab", "Cab", "cab"],
];

export function ModeChips() {
  const toast = useToast();
  const [mode, setMode] = useState("all");
  return (
    <>
      <h2 id="modes-heading">Travel by</h2>
      <div className="modes" role="group" aria-labelledby="modes-heading">
        {MODES.map(([key, label, icon]) => (
          <button
            key={key}
            type="button"
            aria-pressed={mode === key}
            onClick={() => {
              setMode(key);
              if (key === "walk" || key === "bike" || key === "cab") toast(`Showing ${label.toLowerCase()} first in results`);
            }}
          >
            <Icon name={icon} />
            {label}
          </button>
        ))}
      </div>
    </>
  );
}
