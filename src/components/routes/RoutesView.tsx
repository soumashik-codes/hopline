"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type SyntheticEvent } from "react";
import { Icon } from "@/components/Icon";
import { LegsList, RouteStrip } from "@/components/RouteStrip";
import { useToast } from "@/components/Toast";
import { TopBar } from "@/components/TopBar";
import { STEP_FREE_LABEL } from "@/lib/accessibility";
import {
  detailParams,
  endpointToStore,
  routesHref,
  sameEndpoint,
  searchHref,
  type Endpoint,
} from "@/lib/journey";
import { clockOf, dayLabel } from "@/lib/london-time";
import { useSaved } from "@/lib/storage";
import type { Journey, JourneyOptions, JourneyPreference, JourneyResult, LondonTime, StepFreeLevel } from "@/lib/transport/types";

type WhenMode = "now" | "leave" | "arrive";

const WHEN_CHOICES: { mode: WhenMode; label: string }[] = [
  { mode: "now", label: "Leave now" },
  { mode: "leave", label: "Leave at" },
  { mode: "arrive", label: "Arrive by" },
];

const PREFERENCES: { id: JourneyPreference; label: string }[] = [
  { id: "fastest", label: "Fastest" },
  { id: "fewest-changes", label: "Fewest changes" },
  { id: "least-walking", label: "Least walking" },
];

const STEP_FREE_LEVELS: StepFreeLevel[] = ["platform", "train"];

/** "06:37" for today, otherwise "Tomorrow 06:37" or "Mon 9 Nov 06:37". */
function timeText(time: LondonTime, now: LondonTime): string {
  const day = dayLabel(time, now);
  return day === "Today" ? clockOf(time) : `${day} ${clockOf(time)}`;
}

function changesText(changes: number): string {
  return changes === 0 ? "No changes" : changes === 1 ? "1 change" : `${changes} changes`;
}

function whenText(options: JourneyOptions, now: LondonTime): string {
  const { timing } = options;
  if (timing.mode === "now") return "Leaving now";
  return `${timing.mode === "leave" ? "Leaving" : "Arriving by"} ${timeText(timing.at, now)}`;
}

export function RoutesView({
  from,
  to,
  options,
  result,
  now,
}: {
  from: Endpoint;
  to: Endpoint;
  options: JourneyOptions;
  result: JourneyResult;
  /** London time when the page was built; the default for "Leave at" and the basis for "Today" and "Tomorrow". */
  now: LondonTime;
}) {
  const router = useRouter();
  const toast = useToast();
  const [saved, setSaved] = useSaved();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<WhenMode>(options.timing.mode);
  const [at, setAt] = useState<LondonTime>(options.timing.mode === "now" ? now : options.timing.at);
  const [announcement, setAnnouncement] = useState("");

  const journeys: Journey[] = result.ok ? result.journeys : [];

  // Announce results once they arrive; the live region exists before its text changes.
  useEffect(() => {
    const text = !result.ok
      ? "Journeys aren’t available right now"
      : journeys.length === 0
        ? "No journeys found"
        : `${journeys.length} ${journeys.length === 1 ? "journey" : "journeys"} found`;
    const id = window.setTimeout(() => setAnnouncement(text), 100);
    return () => window.clearTimeout(id);
  }, [result, journeys.length]);

  function apply(next: JourneyOptions) {
    startTransition(() => router.replace(routesHref(from, to, next)));
  }

  function submitWhen(e: SyntheticEvent) {
    e.preventDefault();
    apply({ ...options, timing: mode === "now" ? { mode: "now" } : { mode, at } });
  }

  function chooseStepFree(level: StepFreeLevel) {
    apply({ ...options, stepFree: options.stepFree === level ? undefined : level });
  }

  function swap() {
    // "Current location" can't be a destination, so ask the user where they want to go from the new start.
    if (from.current) {
      router.push(searchHref(to, undefined, "to"));
      return;
    }
    startTransition(() => router.replace(routesHref(to, from, options)));
  }

  function saveTrip() {
    const trip = { from: endpointToStore(from), to: endpointToStore(to) };
    if (saved.routes.some((t) => sameEndpoint(t.from, trip.from) && sameEndpoint(t.to, trip.to))) {
      toast("Already saved");
      return;
    }
    setSaved({ ...saved, routes: [trip, ...saved.routes] });
    toast("Trip saved");
  }

  return (
    <>
      <TopBar title="Routes" backHref={searchHref(from, to, "to")} />
      <div className="trip">
        <p className="meta" style={{ margin: 0 }}>
          <span>{from.name}</span>
          <span>to {to.name}</span>
        </p>
        <button type="button" className="iconbtn alt" aria-label="Swap start and destination" onClick={swap}>
          <Icon name="swap" />
        </button>
      </div>

      <form className="whenform" onSubmit={submitWhen}>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend>When</legend>
          <div className="choices">
            {WHEN_CHOICES.map((c) => (
              <label key={c.mode}>
                <input type="radio" name="when" value={c.mode} checked={mode === c.mode} onChange={() => setMode(c.mode)} />
                {c.label}
              </label>
            ))}
          </div>
        </fieldset>
        {mode !== "now" && (
          <label className="at">
            {mode === "leave" ? "Leave at" : "Arrive by"} (London time)
            <input type="datetime-local" required value={at} onChange={(e) => setAt(e.target.value)} />
          </label>
        )}
        <div className="actions">
          <button type="submit" className="primary">
            Show journeys
          </button>
          <button type="button" className="quiet" onClick={saveTrip}>
            <Icon name="star" small />
            Save trip
          </button>
        </div>
      </form>

      <div className="filters">
        <div className="group" role="group" aria-label="Journey type">
          <span aria-hidden="true">Journey type</span>
          {PREFERENCES.map((p) => (
            <button key={p.id} type="button" aria-pressed={options.preference === p.id} onClick={() => apply({ ...options, preference: p.id })}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="group" role="group" aria-label="Accessibility and buses">
          <span aria-hidden="true">Accessibility and buses</span>
          {STEP_FREE_LEVELS.map((level) => (
            <button key={level} type="button" aria-pressed={options.stepFree === level} onClick={() => chooseStepFree(level)}>
              {STEP_FREE_LABEL[level]}
            </button>
          ))}
          <button type="button" aria-pressed={options.busOnly} onClick={() => apply({ ...options, busOnly: !options.busOnly })}>
            Bus only
          </button>
        </div>
      </div>

      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      <h2 className="visually-hidden">Journeys</h2>
      <div aria-busy={pending} style={pending ? { opacity: 0.6 } : undefined}>
        {!result.ok ? (
          <div className="notice" role="alert">
            <b>{result.reason === "not-configured" ? "Journey planning isn’t set up on this server." : "We couldn’t get journeys from TfL just now."}</b>
            {result.reason === "unavailable" && (
              <button type="button" onClick={() => router.refresh()}>
                Try again
              </button>
            )}
          </div>
        ) : journeys.length === 0 ? (
          <p className="empty" style={{ margin: "0 14px" }}>
            TfL found no journeys between these places {whenText(options, now).toLowerCase()}
            {options.busOnly || options.stepFree ? " with these options" : ""}. Try another time
            {options.busOnly || options.stepFree ? ", or turn an option off" : ""}.
          </p>
        ) : (
          <ul className="plain">
            {journeys.map((j) => {
              const disrupted = j.legs.some((l) => l.disruptions.length > 0);
              return (
                <li key={j.id}>
                  <Link className="card" href={`/routes/${j.id}?${detailParams(from, to, options, j.departs)}`}>
                    <div className="top">
                      <span className="dur">
                        {j.mins}
                        <small>min</small>
                      </span>
                      <span className="arr">
                        <span className="visually-hidden">Leave </span>
                        {timeText(j.departs, now)}
                        <span aria-hidden="true"> → </span>
                        <span className="visually-hidden">, arrive </span>
                        {timeText(j.arrives, now)}
                      </span>
                      <span className="fare">{j.fare === undefined ? "Fare not available" : `£${j.fare.toFixed(2)}`}</span>
                    </div>
                    <RouteStrip legs={j.legs} />
                    <LegsList legs={j.legs} />
                    <div className="facts">
                      {changesText(j.changes)}
                      {options.stepFree ? ` · Planned as ${STEP_FREE_LABEL[options.stepFree].toLowerCase()}` : ""}
                    </div>
                    {disrupted && (
                      <div className="alert">
                        <span aria-hidden="true">⚠ </span>Disruption reported on this journey
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="foot">Journeys and fares from TfL Open Data. Where TfL gives no fare, none is shown.</p>
    </>
  );
}
