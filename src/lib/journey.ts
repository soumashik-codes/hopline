// URL helpers shared by server and client code. Journey state lives in the query string, as places with
// coordinates (never just names), so a link always plans the same journey.
import { isLondonTime } from "@/lib/london-time";
import type { JourneyOptions, JourneyPreference, PlaceRef, StepFreeLevel, TravelBy } from "@/lib/transport/types";

export const CURRENT_LOCATION = "Current location";

/**
 * One end of a journey. Coordinates are absent only for "Current location" before the browser has
 * said where the user is.
 */
export interface Endpoint {
  name: string;
  lat?: number;
  lon?: number;
  tflId?: string;
  current?: boolean;
}

export const CURRENT_ENDPOINT: Endpoint = { name: CURRENT_LOCATION, current: true };

export const DEFAULT_OPTIONS: JourneyOptions = { timing: { mode: "now" }, preference: "fastest", busOnly: false };

export const PREFERENCES: readonly JourneyPreference[] = ["fastest", "fewest-changes", "least-walking"];
export const STEP_FREE_LEVELS: readonly StepFreeLevel[] = ["platform", "train"];

/** Keeps only what a journey needs, so extra fields on a stored place never reach a URL. */
export function endpointOf(place: PlaceRef): Endpoint {
  return { name: place.name, lat: place.lat, lon: place.lon, tflId: place.tflId };
}

/** An endpoint to keep for later. "Current location" is stored without a point, so it asks again next time. */
export function endpointToStore(endpoint: Endpoint): Endpoint {
  if (endpoint.current) return CURRENT_ENDPOINT;
  return { name: endpoint.name, lat: endpoint.lat, lon: endpoint.lon, tflId: endpoint.tflId };
}

export function isResolved(endpoint: Endpoint): endpoint is PlaceRef & Endpoint {
  return typeof endpoint.lat === "number" && typeof endpoint.lon === "number";
}

export function sameEndpoint(a: Endpoint, b: Endpoint): boolean {
  return a.name === b.name && a.lat === b.lat && a.lon === b.lon && !!a.current === !!b.current;
}

const MAX_NAME_LENGTH = 120;
const TFL_ID_PATTERN = /^[A-Za-z0-9]{3,40}$/;

function validCoords(lat: unknown, lon: unknown): boolean {
  return typeof lat === "number" && typeof lon === "number" && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}

/** Checks an endpoint read from storage. Old entries that held only names are rejected, not guessed. */
export function isEndpoint(value: unknown): value is Endpoint {
  if (typeof value !== "object" || value === null) return false;
  const e = value as Record<string, unknown>;
  if (typeof e.name !== "string" || !e.name) return false;
  if (e.current === true) return e.name === CURRENT_LOCATION;
  return validCoords(e.lat, e.lon) && (e.tflId === undefined || (typeof e.tflId === "string" && TFL_ID_PATTERN.test(e.tflId)));
}

function setEndpoint(params: URLSearchParams, key: "from" | "to", endpoint: Endpoint) {
  params.set(key, endpoint.name);
  if (isResolved(endpoint)) {
    // "Current location" is rounded to about 10 m; a chosen place keeps full precision.
    const digits = endpoint.current ? 4 : 5;
    params.set(`${key}Lat`, endpoint.lat.toFixed(digits));
    params.set(`${key}Lon`, endpoint.lon.toFixed(digits));
  }
  if (endpoint.tflId) params.set(`${key}Id`, endpoint.tflId);
}

export function journeyParams(from: Endpoint, to: Endpoint, options: JourneyOptions = DEFAULT_OPTIONS): URLSearchParams {
  const params = new URLSearchParams();
  setEndpoint(params, "from", from);
  setEndpoint(params, "to", to);
  if (options.timing.mode !== "now") {
    params.set("when", options.timing.mode);
    params.set("at", options.timing.at);
  }
  if (options.preference !== "fastest") params.set("pref", options.preference);
  if (options.stepFree) params.set("step", options.stepFree);
  if (options.busOnly) params.set("bus", "1");
  if (options.by) params.set("by", options.by === "walking" ? "walk" : "cycle");
  return params;
}

export function routesHref(from: Endpoint, to: Endpoint, options: JourneyOptions = DEFAULT_OPTIONS): string {
  return `/routes?${journeyParams(from, to, options)}`;
}

/** A journey's detail pages re-plan from the journey's own departure time, so "now" can't drift between pages. */
export function detailParams(from: Endpoint, to: Endpoint, options: JourneyOptions, departs: string): URLSearchParams {
  return journeyParams(from, to, { ...options, timing: { mode: "leave", at: departs } });
}

export function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

type Params = Record<string, string | string[] | undefined>;

function parseNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Reads one end of a journey from the URL. Undefined when it is missing or doesn't hold a usable place. */
export function parseEndpoint(params: Params, key: "from" | "to"): Endpoint | undefined {
  const name = firstParam(params[key]).trim().slice(0, MAX_NAME_LENGTH);
  if (!name) return undefined;
  const lat = parseNumber(firstParam(params[`${key}Lat`]));
  const lon = parseNumber(firstParam(params[`${key}Lon`]));
  const hasPoint = validCoords(lat, lon);

  if (name === CURRENT_LOCATION) {
    return hasPoint ? { name, lat, lon, current: true } : CURRENT_ENDPOINT;
  }
  if (!hasPoint) return undefined;
  const id = firstParam(params[`${key}Id`]);
  return { name, lat, lon, tflId: TFL_ID_PATTERN.test(id) ? id : undefined };
}

export function parseOptions(params: Params): JourneyOptions {
  const when = firstParam(params.when);
  const at = firstParam(params.at);
  const pref = firstParam(params.pref);
  const step = firstParam(params.step);
  const by = firstParam(params.by);
  return {
    timing: (when === "leave" || when === "arrive") && isLondonTime(at) ? { mode: when, at } : { mode: "now" },
    preference: PREFERENCES.find((p) => p === pref) ?? "fastest",
    stepFree: STEP_FREE_LEVELS.find((s) => s === step),
    busOnly: firstParam(params.bus) === "1",
    by: (by === "walk" ? "walking" : by === "cycle" ? "cycling" : undefined) satisfies TravelBy | undefined,
  };
}

/** The search screen, with whichever ends of the journey are already chosen. */
export function searchHref(from: Endpoint | undefined, to: Endpoint | undefined, field: "from" | "to"): string {
  const params = new URLSearchParams();
  if (from) setEndpoint(params, "from", from);
  if (to) setEndpoint(params, "to", to);
  params.set("field", field);
  return `/search?${params}`;
}
