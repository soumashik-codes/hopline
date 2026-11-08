import "server-only";

import { TflError, tflGet } from "./tfl-client";
import { stationName } from "./stops";
import type { Journey, JourneyQuery, JourneyResult, Leg, LondonTime, PlaceRef, RideLeg } from "./types";

const JOURNEY_REVALIDATE_SECONDS = 30;

interface TflIdentifier {
  id?: string;
  name?: string;
}

interface TflPoint {
  commonName?: string;
  platformName?: string;
  icsCode?: string;
}

interface TflObstacle {
  type?: string;
  incline?: string;
  stopId?: string | number;
}

interface TflLeg {
  duration?: number;
  departureTime?: string;
  arrivalTime?: string;
  distance?: number;
  mode?: TflIdentifier;
  instruction?: { summary?: string };
  departurePoint?: TflPoint;
  arrivalPoint?: TflPoint;
  path?: { stopPoints?: { name?: string }[] };
  routeOptions?: { name?: string; directions?: string[] }[];
  obstacles?: TflObstacle[];
  disruptions?: { description?: string }[];
}

interface TflJourney {
  startDateTime?: string;
  arrivalDateTime?: string;
  duration?: number;
  fare?: { totalCost?: number };
  legs?: TflLeg[];
}

interface TflJourneyResults {
  journeys?: TflJourney[];
  fromLocationDisambiguation?: { matchStatus?: string };
  toLocationDisambiguation?: { matchStatus?: string };
}

const BUS_MODES = new Set(["bus", "replacement-bus"]);
/** Modes whose names are "<name> line" in everyday speech. */
const LINE_MODES = new Set(["tube", "overground", "elizabeth-line"]);

const PREFERENCE: Record<JourneyQuery["preference"], string | undefined> = {
  fastest: undefined,
  "fewest-changes": "LeastInterchange",
  "least-walking": "LeastWalking",
};

const STEP_FREE: Record<"platform" | "train", string> = {
  platform: "StepFreeToPlatform",
  train: "StepFreeToVehicle",
};

function point(place: PlaceRef, useId: boolean): string {
  return useId && place.tflId ? encodeURIComponent(place.tflId) : `${place.lat},${place.lon}`;
}

function journeyPath(query: JourneyQuery, useIds: boolean): string {
  const params = new URLSearchParams();
  const { timing } = query;
  if (timing.mode !== "now") {
    params.set("date", timing.at.slice(0, 10).replaceAll("-", ""));
    params.set("time", timing.at.slice(11, 16).replace(":", ""));
    params.set("timeIs", timing.mode === "leave" ? "Departing" : "Arriving");
  }
  const preference = PREFERENCE[query.preference];
  if (preference) params.set("journeyPreference", preference);
  if (query.stepFree) params.set("accessibilityPreference", STEP_FREE[query.stepFree]);
  if (query.busOnly) params.set("mode", "bus,walking");
  const qs = params.toString();
  return `/Journey/JourneyResults/${point(query.from, useIds)}/to/${point(query.to, useIds)}${qs ? `?${qs}` : ""}`;
}

/** "2026-11-08T06:37:00" becomes "2026-11-08T06:37". Undefined if TfL sent something else. */
function toLondonTime(value: string | undefined): LondonTime | undefined {
  return value && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) ? value.slice(0, 16) : undefined;
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}

function distanceText(metres: number | undefined): string | undefined {
  if (typeof metres !== "number" || !Number.isFinite(metres) || metres <= 0) return undefined;
  return metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${Math.round(metres)} m`;
}

/** TfL's obstacle codes in plain English, in the order TfL lists them. */
function describeObstacle(o: TflObstacle): string | undefined {
  const direction = o.incline === "UP" ? " up" : o.incline === "DOWN" ? " down" : "";
  switch (o.type) {
    case "STAIRS":
      return `stairs${direction}`;
    case "ESCALATOR":
      return `escalator${direction}`;
    case "LIFT":
      return "lift";
    case "RAMP":
      return `ramp${direction}`;
    case "WALKWAY":
      return "level walkway";
    default:
      return undefined;
  }
}

/** Obstacles belong to the station named by `stopId`, which is the ICS code of the leg's start or end point. */
function accessAt(leg: TflLeg, ics: string | undefined): string[] {
  if (!ics) return [];
  return unique(
    (leg.obstacles ?? [])
      .filter((o) => String(o.stopId ?? "") === ics)
      .map(describeObstacle)
      .filter((d): d is string => !!d),
  );
}

function platformText(leg: TflLeg, bus: boolean): string | undefined {
  const raw = leg.departurePoint?.platformName?.trim();
  if (!raw) return undefined;
  if (bus) return `Stop ${raw}`;
  return /^\d+[A-Za-z]?$/.test(raw) ? `Platform ${raw}` : raw;
}

function toLeg(leg: TflLeg, query: JourneyQuery, first: boolean, last: boolean): Leg | undefined {
  const departs = toLondonTime(leg.departureTime);
  const arrives = toLondonTime(leg.arrivalTime);
  if (!departs || !arrives) return undefined;

  const mode = leg.mode?.id ?? "";
  const disruptions = unique((leg.disruptions ?? []).map((d) => d.description?.trim()).filter((d): d is string => !!d));
  const mins = typeof leg.duration === "number" ? leg.duration : 0;

  if (mode === "walking") {
    // TfL names a walk's ends after the nearest road or building, so the places the user chose are used instead.
    const from = first ? query.from.name : (leg.departurePoint?.commonName ?? "");
    const to = last ? query.to.name : (leg.arrivalPoint?.commonName ?? "");
    return { type: "walk", mins, departs, arrives, from, to, label: `Walk to ${to}`, distance: distanceText(leg.distance), disruptions };
  }

  const bus = BUS_MODES.has(mode);
  const option = leg.routeOptions?.[0];
  const names = unique((leg.routeOptions ?? []).map((o) => o.name?.trim()).filter((n): n is string => !!n));
  const name = names[0] ?? leg.mode?.name ?? mode;
  const tidy = (n: string | undefined) => (bus ? (n ?? "") : stationName(n ?? ""));
  const from = tidy(leg.departurePoint?.commonName);
  const to = tidy(leg.arrivalPoint?.commonName);

  let line = name;
  let label = name;
  let busNumber: string | undefined;
  if (bus) {
    line = "Bus";
    busNumber = names.join(" or ") || undefined;
    label = busNumber ? `Bus ${busNumber}` : "Bus";
  } else if (/ line$/i.test(name)) {
    line = name.replace(/ line$/i, "");
    label = name;
  } else if (LINE_MODES.has(mode)) {
    label = `${name} line`;
  }

  const direction = option?.directions?.[0]?.trim();
  const stops = (leg.path?.stopPoints ?? [])
    .map((s) => tidy(s.name?.trim()))
    .filter((s): s is string => !!s && s !== from && s !== to);

  const ride: RideLeg = {
    type: "ride",
    line,
    label,
    detail: direction ? `towards ${tidy(direction)}` : "",
    mins,
    departs,
    arrives,
    from,
    to,
    stops,
    platform: platformText(leg, bus),
    busNumber,
    station: !bus,
    boardAccess: accessAt(leg, leg.departurePoint?.icsCode),
    alightAccess: accessAt(leg, leg.arrivalPoint?.icsCode),
    disruptions,
  };
  return ride;
}

function toJourney(j: TflJourney, query: JourneyQuery): Journey | undefined {
  const departs = toLondonTime(j.startDateTime);
  const arrives = toLondonTime(j.arrivalDateTime);
  const raw = j.legs ?? [];
  if (!departs || !arrives || typeof j.duration !== "number" || raw.length === 0) return undefined;

  const legs: Leg[] = [];
  for (const [i, leg] of raw.entries()) {
    const mapped = toLeg(leg, query, i === 0, i === raw.length - 1);
    if (!mapped) return undefined;
    legs.push(mapped);
  }

  const cost = j.fare?.totalCost;
  return {
    id: `${departs.replace(/\D/g, "")}-${arrives.replace(/\D/g, "")}`,
    departs,
    arrives,
    mins: j.duration,
    // TfL gives pence. A fare is only shown when TfL supplies one.
    fare: typeof cost === "number" && cost >= 0 ? cost / 100 : undefined,
    changes: Math.max(0, legs.filter((l) => l.type === "ride").length - 1),
    legs,
  };
}

/** TfL answers 300 when it can't tell which place was meant, instead of giving journeys. */
function needsDisambiguation(data: TflJourneyResults): boolean {
  return !data.journeys && (data.fromLocationDisambiguation?.matchStatus === "list" || data.toLocationDisambiguation?.matchStatus === "list");
}

export async function getJourneys(query: JourneyQuery): Promise<JourneyResult> {
  try {
    const revalidate = query.timing.mode === "now" ? JOURNEY_REVALIDATE_SECONDS : JOURNEY_REVALIDATE_SECONDS * 2;
    let response = await tflGet<TflJourneyResults>(journeyPath(query, true), { revalidate });
    // A stop id TfL finds ambiguous is retried by position, which is never ambiguous.
    if (needsDisambiguation(response.data)) response = await tflGet<TflJourneyResults>(journeyPath(query, false), { revalidate });
    const { data, fetchedAt } = response;
    if (!data || (data.journeys !== undefined && !Array.isArray(data.journeys))) throw new TflError("bad-response");

    const journeys = (data.journeys ?? []).map((j) => toJourney(j, query)).filter((j): j is Journey => !!j);
    return { ok: true, journeys, updatedAt: fetchedAt };
  } catch (err) {
    // 404 is TfL's way of saying there is no journey between these two points.
    if (err instanceof TflError && err.code === "http" && err.status === 404) return { ok: true, journeys: [] };
    const code = err instanceof TflError ? err.code : "unexpected";
    console.error(`[tfl] journeys failed: ${code}${err instanceof TflError && err.status ? ` (${err.status})` : ""}`);
    return { ok: false, reason: code === "not-configured" ? "not-configured" : "unavailable" };
  }
}
