"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type KeyboardEvent, type SyntheticEvent } from "react";
import { Icon } from "@/components/Icon";
import { LegsList, RouteStrip } from "@/components/RouteStrip";
import { useToast } from "@/components/Toast";
import { TopBar } from "@/components/TopBar";
import { STEP_FREE_LABEL } from "@/lib/accessibility";
import { detailParams, endpointToStore, routesHref, sameEndpoint, searchHref, type Endpoint } from "@/lib/journey";
import { clockOf, dayLabel } from "@/lib/london-time";
import { useSaved } from "@/lib/storage";
import type { Journey, JourneyOptions, JourneyResult, JourneyTiming, LondonTime, RideLeg, TravelBy } from "@/lib/transport/types";

type WhenMode = JourneyTiming["mode"];

const WHEN_CHOICES: { mode: WhenMode; label: string }[] = [
  { mode: "now", label: "Leave now" },
  { mode: "leave", label: "Leave at" },
  { mode: "arrive", label: "Arrive by" },
];

type JourneyType = "fastest" | "fewest-changes" | "least-walking" | "step-free-platform" | "step-free-train" | "bus-only";

const JOURNEY_TYPES: { id: JourneyType; label: string }[] = [
  { id: "fastest", label: "Fastest" },
  { id: "fewest-changes", label: "Fewest changes" },
  { id: "least-walking", label: "Least walking" },
  { id: "step-free-platform", label: "Step-free to platform" },
  { id: "step-free-train", label: "Step-free to train" },
  { id: "bus-only", label: "Bus only" },
];

/** The one type that describes the options, so the row can show a single selection. */
function typeOf(options: JourneyOptions): JourneyType {
  if (options.stepFree === "platform") return "step-free-platform";
  if (options.stepFree === "train") return "step-free-train";
  if (options.busOnly) return "bus-only";
  return options.preference;
}

function optionsFor(type: JourneyType, timing: JourneyTiming): JourneyOptions {
  switch (type) {
    case "step-free-platform":
      return { timing, preference: "fastest", stepFree: "platform", busOnly: false };
    case "step-free-train":
      return { timing, preference: "fastest", stepFree: "train", busOnly: false };
    case "bus-only":
      return { timing, preference: "fastest", busOnly: true };
    default:
      return { timing, preference: type, busOnly: false };
  }
}

/** "06:37" for today, otherwise "Tomorrow 06:37" or "Mon 9 Nov 06:37". */
function timeText(time: LondonTime, now: LondonTime): string {
  const day = dayLabel(time, now);
  return day === "Today" ? clockOf(time) : `${day} ${clockOf(time)}`;
}

function whenLabel(timing: JourneyTiming, now: LondonTime): string {
  if (timing.mode === "now") return "Leave now";
  return `${timing.mode === "leave" ? "Leave at" : "Arrive by"} ${timeText(timing.at, now)}`;
}

function changesText(changes: number): string {
  return changes === 0 ? "No changes" : changes === 1 ? "1 change" : `${changes} changes`;
}

/** "Jubilee" or "Bus N83": how to name the first ride in the set-off line. */
function rideName(ride: RideLeg): string {
  return ride.busNumber ? `Bus ${ride.busNumber}` : ride.line;
}

const BY_LABEL: Record<TravelBy, string> = { walking: "Walk", cycling: "Cycle" };

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
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<WhenMode>(options.timing.mode);
  const [at, setAt] = useState<LondonTime>(options.timing.mode === "now" ? now : options.timing.at);
  const [announcement, setAnnouncement] = useState("");
  const whenButton = useRef<HTMLButtonElement>(null);

  const journeys: Journey[] = result.ok ? result.journeys : [];
  const alternatives = result.ok ? result.alternatives : [];
  const selectedType = typeOf(options);

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

  function chooseWhen(next: WhenMode) {
    setMode(next);
    // "Leave now" needs nothing more, so it loads straight away.
    if (next === "now") {
      setOpen(false);
      apply({ ...options, timing: { mode: "now" } });
    }
  }

  function submitWhen(e: SyntheticEvent) {
    e.preventDefault();
    if (mode === "now") return;
    setOpen(false);
    apply({ ...options, timing: { mode, at } });
    whenButton.current?.focus();
  }

  function closeOnEscape(e: KeyboardEvent) {
    if (e.key !== "Escape") return;
    e.preventDefault();
    setOpen(false);
    whenButton.current?.focus();
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
        <button type="button" className="iconbtn alt" aria-label="Save trip" onClick={saveTrip}>
          <Icon name="star" />
        </button>
        <button type="button" className="iconbtn alt" aria-label="Swap start and destination" onClick={swap}>
          <Icon name="swap" />
        </button>
      </div>

      <div className="bar">
        <button
          ref={whenButton}
          type="button"
          className="whenbtn"
          aria-expanded={open}
          aria-controls="when-panel"
          onClick={() => setOpen(!open)}
        >
          <Icon name="clock" small />
          {whenLabel(options.timing, now)}
          <Icon name="chevron" small />
        </button>
        {alternatives.length > 0 && (
          <ul className="altlinks" aria-label="Walking and cycling the whole way">
            {alternatives.map(({ by, journey }) => (
              <li key={by}>
                <Link href={`/routes/${journey.id}?${detailParams(from, to, { ...options, by }, journey.departs)}`}>
                  <Icon name={by === "walking" ? "walk" : "bike"} small />
                  {BY_LABEL[by]} {journey.mins} min
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {open && (
        <form id="when-panel" className="whenform" onSubmit={submitWhen} onKeyDown={closeOnEscape}>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="visually-hidden">When</legend>
            <div className="choices">
              {WHEN_CHOICES.map((c) => (
                <label key={c.mode}>
                  <input type="radio" name="when" value={c.mode} checked={mode === c.mode} onChange={() => chooseWhen(c.mode)} />
                  {c.label}
                </label>
              ))}
            </div>
          </fieldset>
          {mode !== "now" && (
            <>
              <label className="at">
                {mode === "leave" ? "Leave at" : "Arrive by"} (London time)
                <input type="datetime-local" required value={at} onChange={(e) => setAt(e.target.value)} />
              </label>
              <div className="actions">
                <button type="submit" className="primary">
                  Show journeys
                </button>
              </div>
            </>
          )}
        </form>
      )}

      <fieldset className="types">
        <legend className="visually-hidden">Journey type</legend>
        <div className="scroll">
          {JOURNEY_TYPES.map((t) => (
            <label key={t.id}>
              <input
                type="radio"
                name="journey-type"
                value={t.id}
                checked={selectedType === t.id}
                onChange={() => apply(optionsFor(t.id, options.timing))}
              />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>

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
            TfL found no journeys between these places for {whenLabel(options.timing, now).toLowerCase()}
            {selectedType === "step-free-platform" || selectedType === "step-free-train" || selectedType === "bus-only" ? " with this option" : ""}. Try another
            time{selectedType === "fastest" || selectedType === "fewest-changes" || selectedType === "least-walking" ? "" : ", or pick another journey type"}.
          </p>
        ) : (
          <ul className="plain">
            {journeys.map((j) => {
              const disrupted = j.legs.some((l) => l.disruptions.length > 0);
              const board = j.legs.find((l): l is RideLeg => l.type === "ride");
              // When the journey starts on foot, the time that matters is when to leave the start, from TfL's walk.
              const [first, second] = j.legs;
              const walkFirst = first.type === "walk" && first.travel === "walking" && second?.type === "ride" ? { walk: first, ride: second } : undefined;
              return (
                <li key={j.id}>
                  <Link className="card" href={`/routes/${j.id}?${detailParams(from, to, options, j.departs)}`}>
                    <div className="top">
                      <span className="dur">
                        {j.mins}
                        <small>min</small>
                      </span>
                      <span className="arr">
                        Arrives <b>{timeText(j.arrives, now)}</b>
                      </span>
                      <span className="fare">{j.fare === undefined ? "Fare not available" : `£${j.fare.toFixed(2)}`}</span>
                    </div>
                    {walkFirst ? (
                      <div className="setoff">
                        <div>
                          Set off <b>{timeText(walkFirst.walk.departs, now)}</b>
                          <span aria-hidden="true"> · </span>
                          <span className="visually-hidden">, </span>
                          {walkFirst.walk.mins === 0 ? "walk under 1 min" : `walk ${walkFirst.walk.mins} min`} to {walkFirst.ride.from}
                        </div>
                        <div>
                          <span className="visually-hidden">Then </span>
                          {rideName(walkFirst.ride)} <b>{timeText(walkFirst.ride.departs, now)}</b>
                        </div>
                      </div>
                    ) : (
                      <div className="leaves">
                        Leaves <b>{timeText(board?.departs ?? j.departs, now)}</b>
                        {board ? (
                          <>
                            {" "}
                            from <b>{board.from}</b>
                          </>
                        ) : null}
                      </div>
                    )}
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
