import "server-only";

import { fetchJson, ServiceError } from "./fetch-json";
import { getGeoapifyKey } from "./server-config";
import type { Place, PlaceKind } from "./types";

const URL_BASE = "https://api.geoapify.com/v1/geocode/autocomplete";
// Ask for more than we show: a lookup costs one credit however many results it returns, and
// several of them are usually the same place listed more than once.
const FETCH_LIMIT = 8;
const MAX_SUGGESTIONS = 5;

// Places with the same name closer together than this count as one place.
const SAME_PLACE_METRES = 750;
// Even when far apart, show at most this many places with one name ("Tesco Express" everywhere).
const MAX_PER_NAME = 2;
const LONDON_CENTRE_POINT = { lat: 51.5072, lon: -0.1276 };

// Greater London, west/south/east/north. Hopline is London-only for now.
const LONDON_RECT = "rect:-0.57,51.26,0.34,51.70";
const LONDON_CENTRE = "proximity:-0.1276,51.5072";

// The free plan allows 3,000 credits a day and each lookup costs one. Stop well short of that.
// This count lives in one server process, so it is a safety net rather than an exact meter.
const DAILY_SOFT_LIMIT = 2_500;
const budget = { day: "", used: 0 };

function takeCredit(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (budget.day !== today) {
    budget.day = today;
    budget.used = 0;
  }
  if (budget.used >= DAILY_SOFT_LIMIT) return false;
  budget.used += 1;
  return true;
}

interface GeoapifyResult {
  name?: string;
  address_line1?: string;
  address_line2?: string;
  housenumber?: string;
  result_type?: string;
  /** Geoapify's category, e.g. "public_transport.bus". Absent for many places. */
  category?: string;
  lat?: number;
  lon?: number;
  rank?: { confidence?: number; importance?: number };
}

interface Candidate {
  place: Place;
  confidence: number;
  importance: number;
}

function metresBetween(a: Place, b: { lat: number; lon: number }): number {
  const dLat = (a.lat - b.lat) * 111_320;
  const dLon = (a.lon - b.lon) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLon);
}

/** Best match first: Geoapify's confidence, then how well known the place is, then nearest central London. */
function isBetter(a: Candidate, b: Candidate): boolean {
  return (
    a.confidence !== b.confidence
      ? a.confidence > b.confidence
      : a.importance !== b.importance
        ? a.importance > b.importance
        : metresBetween(a.place, LONDON_CENTRE_POINT) < metresBetween(b.place, LONDON_CENTRE_POINT)
  );
}

/**
 * Geoapify often lists one place several times (every entrance or mapped copy of "Wembley Stadium").
 * Keep the best match for each name, and another only if it is somewhere genuinely different.
 * Results keep Geoapify's own order.
 */
function dropDuplicates(candidates: Candidate[]): Place[] {
  const keptByName = new Map<string, Candidate[]>();
  const bestFirst = [...candidates].sort((a, b) => (isBetter(a, b) ? -1 : isBetter(b, a) ? 1 : 0));
  for (const c of bestFirst) {
    const name = c.place.name.toLowerCase();
    const kept = keptByName.get(name) ?? [];
    const duplicate = kept.length >= MAX_PER_NAME || kept.some((k) => metresBetween(c.place, k.place) < SAME_PLACE_METRES);
    if (!duplicate) keptByName.set(name, [...kept, c]);
  }
  const keep = new Set([...keptByName.values()].flat());
  return candidates.filter((c) => keep.has(c)).map((c) => c.place);
}

/**
 * OpenStreetMap lists railway features such as "Willesden Junction (Acton Branch)" as places. They are
 * parts of a station or track, not somewhere to go, and TfL already gives the real station. Only
 * untagged or transport-tagged amenities are dropped, so "Junction Road" and a pub called "The Junction" stay.
 */
function isRailwayJunction(r: GeoapifyResult, name: string): boolean {
  if (r.result_type !== "amenity" || !/junction/i.test(name)) return false;
  const category = r.category ?? "";
  return !category || category.startsWith("railway") || category.startsWith("public_transport") || category.startsWith("building.transportation");
}

function kindOf(r: GeoapifyResult, name: string): PlaceKind {
  const type = r.result_type ?? "";
  if (r.category?.startsWith("public_transport.bus")) return "bus-stop";
  if (type === "street" || type === "building" || type === "postcode") return "address";
  // Geoapify marks both "10 Downing Street" and "Wembley Stadium" as amenities: a name that starts with the house number is an address.
  if (type === "amenity" && r.housenumber && name.startsWith(r.housenumber)) return "address";
  return "place";
}

/**
 * Searches addresses and named places. Results are never cached or stored on the server:
 * Geoapify's terms don't say whether that is allowed, so the browser keeps only what the user picks.
 */
export async function searchGeocoder(query: string): Promise<Place[]> {
  const key = getGeoapifyKey();
  if (!key) throw new ServiceError("geoapify", "not-configured");
  if (!takeCredit()) throw new ServiceError("geoapify", "limited");

  const url = new URL(URL_BASE);
  url.search = new URLSearchParams({
    text: query,
    filter: LONDON_RECT,
    bias: LONDON_CENTRE,
    lang: "en",
    limit: String(FETCH_LIMIT),
    format: "json",
    apiKey: key,
  }).toString();

  const body = await fetchJson<{ results?: GeoapifyResult[] }>("geoapify", url.toString(), { cache: "no-store" });
  if (!Array.isArray(body.results)) throw new ServiceError("geoapify", "bad-response");

  const seen = new Set<string>();
  const candidates: Candidate[] = [];
  for (const r of body.results) {
    const name = (r.address_line1 || r.name || "").trim();
    if (!name || typeof r.lat !== "number" || typeof r.lon !== "number" || isRailwayJunction(r, name)) continue;
    const id = `geo:${r.lat.toFixed(5)},${r.lon.toFixed(5)}:${name.toLowerCase()}`;
    if (seen.has(id)) continue;
    seen.add(id);
    candidates.push({
      place: {
        id,
        name,
        detail: (r.address_line2 ?? "").replace(/,?\s*United Kingdom$/, "").trim(),
        kind: kindOf(r, name),
        lat: r.lat,
        lon: r.lon,
      },
      confidence: r.rank?.confidence ?? 0,
      importance: r.rank?.importance ?? 0,
    });
  }
  return dropDuplicates(candidates).slice(0, MAX_SUGGESTIONS);
}
