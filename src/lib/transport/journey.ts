import "server-only";

import { addMinutes, londonNow, minutesBetween } from "@/lib/london-time";
import { TflError, tflGet } from "./tfl-client";
import { stationName } from "./stops";
import type { Journey, JourneyQuery, JourneyResult, JourneyTiming, Leg, LondonTime, PlaceRef, RideLeg, TravelBy, WalkLeg } from "./types";

const JOURNEY_REVALIDATE_SECONDS = 30;
const STOP_REVALIDATE_SECONDS = 24 * 60 * 60;

// When the first journey leaves this long after the time asked for, the stops at the start have closed for the
// night, so we also try the nearest stops that are still running.
const LATE_START_MINUTES = 60;
const NEARBY_RADIUS_METRES = 1500;
// Stops closer than this were already reached by TfL's own search from the start.
const NEARBY_MIN_METRES = 400;
const NEARBY_STATIONS = 2;
const NEARBY_NIGHT_BUS_STOPS = 2;
const JOURNEYS_PER_NEARBY_START = 2;

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

/** A place TfL can plan from or to: its stop code when it has one, otherwise its position. */
interface Point {
  code?: string;
  lat: number;
  lon: number;
}

/** What to ask TfL for. `mode` limits the journey to walking or cycling. */
interface PlanRequest {
  timing: JourneyTiming;
  preference?: JourneyQuery["preference"];
  stepFree?: JourneyQuery["stepFree"];
  busOnly?: boolean;
  mode?: "walking" | "cycle";
}

/**
 * A search result for a big interchange carries a "hub" id. TfL plans to a hub's nominal centre, which
 * for Waterloo is an area of Lambeth 18 minutes' walk from the platforms. The hub's ICS code names the
 * station itself, so that is sent instead. Other ids are sent as they are.
 */
async function pointOf(place: PlaceRef): Promise<Point> {
  const point: Point = { code: place.tflId, lat: place.lat, lon: place.lon };
  if (!place.tflId?.startsWith("HUB")) return point;
  try {
    const { data } = await tflGet<{ icsCode?: string }>(`/StopPoint/${encodeURIComponent(place.tflId)}`, { revalidate: STOP_REVALIDATE_SECONDS });
    if (data?.icsCode && /^\d+$/.test(data.icsCode)) point.code = data.icsCode;
  } catch (err) {
    const code = err instanceof TflError ? err.code : "unexpected";
    console.error(`[tfl] hub lookup failed: ${code}`);
  }
  return point;
}

function pointParam(point: Point, useCode: boolean): string {
  return useCode && point.code ? encodeURIComponent(point.code) : `${point.lat},${point.lon}`;
}

function journeyPath(from: Point, to: Point, req: PlanRequest, useCodes: boolean): string {
  const params = new URLSearchParams();
  if (req.timing.mode !== "now") {
    params.set("date", req.timing.at.slice(0, 10).replaceAll("-", ""));
    params.set("time", req.timing.at.slice(11, 16).replace(":", ""));
    params.set("timeIs", req.timing.mode === "leave" ? "Departing" : "Arriving");
  }
  const preference = req.preference && PREFERENCE[req.preference];
  if (preference) params.set("journeyPreference", preference);
  if (req.stepFree) params.set("accessibilityPreference", STEP_FREE[req.stepFree]);
  if (req.mode) params.set("mode", req.mode);
  else if (req.busOnly) params.set("mode", "bus,walking");
  const qs = params.toString();
  return `/Journey/JourneyResults/${pointParam(from, useCodes)}/to/${pointParam(to, useCodes)}${qs ? `?${qs}` : ""}`;
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

interface Names {
  from: string;
  to: string;
}

function toLeg(leg: TflLeg, names: Names, first: boolean, last: boolean): Leg | undefined {
  const departs = toLondonTime(leg.departureTime);
  const arrives = toLondonTime(leg.arrivalTime);
  if (!departs || !arrives) return undefined;

  const mode = leg.mode?.id ?? "";
  const disruptions = unique((leg.disruptions ?? []).map((d) => d.description?.trim()).filter((d): d is string => !!d));
  const mins = typeof leg.duration === "number" ? leg.duration : 0;

  if (mode === "walking" || mode === "cycle") {
    // TfL names a walk's ends after the nearest road or building, so the places the user chose are used instead.
    const from = first ? names.from : (leg.departurePoint?.commonName ?? "");
    const to = last ? names.to : (leg.arrivalPoint?.commonName ?? "");
    const travel: TravelBy = mode === "cycle" ? "cycling" : "walking";
    const verb = travel === "cycling" ? "Cycle" : "Walk";
    return { type: "walk", travel, mins, departs, arrives, from, to, label: `${verb} to ${to}`, distance: distanceText(leg.distance), disruptions };
  }

  const bus = BUS_MODES.has(mode);
  const option = leg.routeOptions?.[0];
  const routeNames = unique((leg.routeOptions ?? []).map((o) => o.name?.trim()).filter((n): n is string => !!n));
  const name = routeNames[0] ?? leg.mode?.name ?? mode;
  const tidy = (n: string | undefined) => (bus ? (n ?? "") : stationName(n ?? ""));
  const from = tidy(leg.departurePoint?.commonName);
  const to = tidy(leg.arrivalPoint?.commonName);

  let line = name;
  let label = name;
  let busNumber: string | undefined;
  if (bus) {
    line = "Bus";
    busNumber = routeNames.join(" or ") || undefined;
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

function journeyId(departs: LondonTime, arrives: LondonTime): string {
  return `${departs.replace(/\D/g, "")}-${arrives.replace(/\D/g, "")}`;
}

function changesOf(legs: Leg[]): number {
  return Math.max(0, legs.filter((l) => l.type === "ride").length - 1);
}

function toJourney(j: TflJourney, names: Names): Journey | undefined {
  const departs = toLondonTime(j.startDateTime);
  const arrives = toLondonTime(j.arrivalDateTime);
  const raw = j.legs ?? [];
  if (!departs || !arrives || typeof j.duration !== "number" || raw.length === 0) return undefined;

  const legs: Leg[] = [];
  for (const [i, leg] of raw.entries()) {
    const mapped = toLeg(leg, names, i === 0, i === raw.length - 1);
    if (!mapped) return undefined;
    legs.push(mapped);
  }

  const cost = j.fare?.totalCost;
  return {
    id: journeyId(departs, arrives),
    departs,
    arrives,
    mins: j.duration,
    // TfL gives pence. A fare is only shown when TfL supplies one.
    fare: typeof cost === "number" && cost >= 0 ? cost / 100 : undefined,
    changes: changesOf(legs),
    legs,
  };
}

/** TfL answers 300 when it can't tell which place was meant, instead of giving journeys. */
function needsDisambiguation(data: TflJourneyResults): boolean {
  return !data.journeys && (data.fromLocationDisambiguation?.matchStatus === "list" || data.toLocationDisambiguation?.matchStatus === "list");
}

interface Planned {
  journeys: Journey[];
  fetchedAt?: string;
}

/** One TfL journey search. No journeys at all (TfL's 404) is an empty answer, not an error. */
async function plan(from: Point, to: Point, req: PlanRequest, names: Names): Promise<Planned> {
  const revalidate = req.timing.mode === "now" ? JOURNEY_REVALIDATE_SECONDS : JOURNEY_REVALIDATE_SECONDS * 2;
  try {
    let response = await tflGet<TflJourneyResults>(journeyPath(from, to, req, true), { revalidate });
    // A stop code TfL finds ambiguous is retried by position, which is never ambiguous.
    if (needsDisambiguation(response.data)) response = await tflGet<TflJourneyResults>(journeyPath(from, to, req, false), { revalidate });
    const { data, fetchedAt } = response;
    if (!data || (data.journeys !== undefined && !Array.isArray(data.journeys))) throw new TflError("bad-response");
    const journeys = (data.journeys ?? []).map((j) => toJourney(j, names)).filter((j): j is Journey => !!j);
    return { journeys, fetchedAt };
  } catch (err) {
    if (err instanceof TflError && err.code === "http" && err.status === 404) return { journeys: [] };
    throw err;
  }
}

function describeError(err: unknown): string {
  const code = err instanceof TflError ? err.code : "unexpected";
  return `${code}${err instanceof TflError && err.status ? ` (${err.status})` : ""}`;
}

/** A walk or cycle the whole way, if TfL returned one. */
async function wholeTrip(from: Point, to: Point, timing: JourneyTiming, by: TravelBy, names: Names): Promise<Journey | undefined> {
  try {
    const { journeys } = await plan(from, to, { timing, mode: by === "walking" ? "walking" : "cycle" }, names);
    return journeys.find((j) => j.legs.every((l) => l.type === "walk" && l.travel === by));
  } catch (err) {
    console.error(`[tfl] ${by} failed: ${describeError(err)}`);
    return undefined;
  }
}

interface NearbyStop {
  id?: string;
  commonName?: string;
  lat?: number;
  lon?: number;
  modes?: string[];
  lines?: { name?: string }[];
}

const RAIL_MODES = new Set(["tube", "dlr", "overground", "elizabeth-line", "national-rail", "tram"]);

function metresBetween(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = (a.lat - b.lat) * 111_320;
  const dLon = (a.lon - b.lon) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLon);
}

/** Names of the rail lines TfL says run a night service (the Night Tube). Empty if TfL can't say. */
async function nightRailLines(): Promise<Set<string>> {
  try {
    const { data } = await tflGet<{ name?: string }[]>("/Line/Mode/tube,overground,elizabeth-line,dlr,tram/Route?serviceTypes=Night", {
      revalidate: STOP_REVALIDATE_SECONDS,
    });
    return new Set((Array.isArray(data) ? data : []).map((l) => l.name).filter((n): n is string => !!n));
  } catch (err) {
    console.error(`[tfl] night lines failed: ${describeError(err)}`);
    return new Set();
  }
}

/**
 * The nearest stations on a line with a night service and the nearest stops with a night bus (an
 * N-numbered route), within a short walk of the start.
 */
interface NearbyStart {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

async function nearbyStarts(origin: PlaceRef): Promise<NearbyStart[]> {
  const [{ data }, nightLines] = await Promise.all([
    tflGet<{ stopPoints?: NearbyStop[] }>(
      `/StopPoint?lat=${origin.lat}&lon=${origin.lon}&radius=${NEARBY_RADIUS_METRES}&stopTypes=NaptanMetroStation,NaptanRailStation,NaptanPublicBusCoachTram`,
      { revalidate: STOP_REVALIDATE_SECONDS },
    ),
    nightRailLines(),
  ]);
  const ranked = (data?.stopPoints ?? [])
    .flatMap((s) =>
      s.id && s.commonName && typeof s.lat === "number" && typeof s.lon === "number" && s.id !== origin.tflId
        ? [{ stop: s as NearbyStop & { id: string; commonName: string; lat: number; lon: number }, metres: metresBetween(origin, { lat: s.lat, lon: s.lon }) }]
        : [],
    )
    .filter((c) => c.metres >= NEARBY_MIN_METRES)
    .sort((a, b) => a.metres - b.metres);

  const isRail = (s: NearbyStop) => !!s.modes?.some((m) => RAIL_MODES.has(m));
  const stationSeen = new Set<string>();
  const stations = ranked
    .filter((c) => isRail(c.stop) && c.stop.lines?.some((l) => nightLines.has(l.name ?? "")))
    // A station can be listed once for the Tube and again for National Rail.
    .filter((c) => !stationSeen.has(stationName(c.stop.commonName)) && !!stationSeen.add(stationName(c.stop.commonName)))
    .slice(0, NEARBY_STATIONS);
  const nightSeen = new Set<string>();
  const nightBusStops = ranked
    .filter((c) => c.stop.lines?.some((l) => /^N\d+$/.test(l.name ?? "")))
    .filter((c) => !nightSeen.has(c.stop.commonName) && !!nightSeen.add(c.stop.commonName))
    .slice(0, NEARBY_NIGHT_BUS_STOPS);

  const chosen = new Map<string, NearbyStart>();
  for (const { stop } of [...stations, ...nightBusStops]) {
    chosen.set(stop.id, { id: stop.id, name: isRail(stop) ? stationName(stop.commonName) : stop.commonName, lat: stop.lat, lon: stop.lon });
  }
  return [...chosen.values()];
}

/**
 * Journeys that start with a walk to a stop that is still running. TfL gives the walk and the journey from
 * that stop; we only join them. The journey is asked for after the walk would finish, so nothing is
 * promised that the walk can't meet.
 */
async function journeysViaNearbyStart(query: JourneyQuery, to: Point, requested: LondonTime): Promise<Journey[]> {
  const origin: Point = { lat: query.from.lat, lon: query.from.lon };
  const starts = await nearbyStarts(query.from);

  const viaStart = async (start: NearbyStart): Promise<Journey[]> => {
    const stop: Point = { code: start.id, lat: start.lat, lon: start.lon };
    const walks = await plan(origin, stop, { timing: { mode: "leave", at: requested }, mode: "walking" }, { from: query.from.name, to: start.name });
    const walk = walks.journeys.find((j) => j.legs.length === 1 && j.legs[0].type === "walk")?.legs[0];
    if (!walk || walk.type !== "walk") return [];

    const ready = addMinutes(requested, walk.mins);
    const onward = await plan(stop, to, { ...query, timing: { mode: "leave", at: ready } }, { from: start.name, to: query.to.name });
    return onward.journeys
      .filter((j) => minutesBetween(ready, j.departs) <= LATE_START_MINUTES)
      .slice(0, JOURNEYS_PER_NEARBY_START)
      .map((j): Journey => {
        const leaves = addMinutes(j.departs, -walk.mins);
        const first: WalkLeg = { ...walk, departs: leaves, arrives: j.departs };
        const legs: Leg[] = [first, ...j.legs];
        return { ...j, id: journeyId(leaves, j.arrives), departs: leaves, mins: minutesBetween(leaves, j.arrives), changes: changesOf(legs), legs };
      });
  };

  const settled = await Promise.allSettled(starts.map(viaStart));
  return settled.flatMap((r) => {
    if (r.status === "fulfilled") return r.value;
    console.error(`[tfl] nearby start failed: ${describeError(r.reason)}`);
    return [];
  });
}

function walkingMinutes(j: Journey): number {
  return j.legs.reduce((sum, l) => sum + (l.type === "walk" ? l.mins : 0), 0);
}

/**
 * Orders journeys by what the user asked for, using only TfL's own times. "Fastest" is the earliest
 * arrival; when arriving by a time, the latest departure that still gets there.
 */
function sortJourneys(journeys: Journey[], query: JourneyQuery): Journey[] {
  const byArrival = (a: Journey, b: Journey) => a.arrives.localeCompare(b.arrives) || b.departs.localeCompare(a.departs);
  const byLatestDeparture = (a: Journey, b: Journey) => b.departs.localeCompare(a.departs) || a.mins - b.mins;
  const tieBreak = query.timing.mode === "arrive" ? byLatestDeparture : byArrival;
  const sorted = [...journeys];
  if (query.preference === "fewest-changes") return sorted.sort((a, b) => a.changes - b.changes || tieBreak(a, b));
  if (query.preference === "least-walking") return sorted.sort((a, b) => walkingMinutes(a) - walkingMinutes(b) || tieBreak(a, b));
  return sorted.sort(tieBreak);
}

function uniqueById(journeys: Journey[]): Journey[] {
  const seen = new Set<string>();
  return journeys.filter((j) => !seen.has(j.id) && !!seen.add(j.id));
}

export async function getJourneys(query: JourneyQuery): Promise<JourneyResult> {
  try {
    const [from, to] = await Promise.all([pointOf(query.from), pointOf(query.to)]);
    const names: Names = { from: query.from.name, to: query.to.name };

    if (query.by) {
      const { journeys, fetchedAt } = await plan(from, to, { timing: query.timing, mode: query.by === "walking" ? "walking" : "cycle" }, names);
      return { ok: true, journeys: sortJourneys(journeys, query), alternatives: [], updatedAt: fetchedAt };
    }

    const [main, walking, cycling] = await Promise.all([
      plan(from, to, query, names),
      wholeTrip(from, to, query.timing, "walking", names),
      wholeTrip(from, to, query.timing, "cycling", names),
    ]);

    let journeys = main.journeys;
    const requested = query.timing.mode === "leave" ? query.timing.at : query.timing.mode === "now" ? londonNow() : undefined;
    const lateStart = journeys.length === 0 || (requested !== undefined && minutesBetween(requested, journeys[0].departs) > LATE_START_MINUTES);
    if (requested && lateStart) {
      try {
        journeys = [...journeys, ...(await journeysViaNearbyStart(query, to, requested))];
      } catch (err) {
        console.error(`[tfl] nearby starts failed: ${describeError(err)}`);
      }
    }

    const alternatives = [
      ...(walking ? [{ by: "walking" as const, journey: walking }] : []),
      ...(cycling ? [{ by: "cycling" as const, journey: cycling }] : []),
    ];
    return { ok: true, journeys: sortJourneys(uniqueById(journeys), query), alternatives, updatedAt: main.fetchedAt };
  } catch (err) {
    console.error(`[tfl] journeys failed: ${describeError(err)}`);
    return { ok: false, reason: err instanceof TflError && err.code === "not-configured" ? "not-configured" : "unavailable" };
  }
}
