import "server-only";

import { MAX_RESULTS, MIN_QUERY_LENGTH } from "@/lib/places";
import { searchGeocoder } from "./geocode";
import { ServiceError } from "./fetch-json";
import { isPostcodeLookup, looksLikePostcode, searchPostcodes } from "./postcodes";
import { TflError } from "./tfl-client";
import { searchTflStops } from "./tfl-provider";
import type { Place, PlaceSearchResult, PlaceSearchSource } from "./types";

// A Geoapify place is dropped if it has a similar name and is this close to a TfL station or bus stop,
// or if it is on the very same spot as a station.
const NEAR_STATION_METRES = 300;
const NEAR_BUS_STOP_METRES = 100;
const SAME_SPOT_METRES = 15;

function metresBetween(a: Place, b: Place): number {
  const dLat = (a.lat - b.lat) * 111_320;
  const dLon = (a.lon - b.lon) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLon);
}

function simplify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** The geocoder also knows stations and stops. Drop its copy when TfL already gave us the same one. */
function isDuplicateOf(place: Place, known: Place[]): boolean {
  const name = simplify(place.name);
  return known.some((k) => {
    const metres = metresBetween(place, k);
    if (k.kind === "station" && metres < SAME_SPOT_METRES) return true;
    const other = simplify(k.name);
    const similar = name.length >= 4 && other.length >= 4 && (name.includes(other) || other.includes(name));
    return similar && metres < (k.kind === "station" ? NEAR_STATION_METRES : NEAR_BUS_STOP_METRES);
  });
}

interface Group {
  places: Place[];
  /** How many results this group is guaranteed before leftover space is shared out. */
  quota: number;
}

/** Fills MAX_RESULTS fairly: each group gets its quota first, then spare space goes to whoever has more. */
function share(groups: Group[]): Place[] {
  const taken = groups.map((g) => Math.min(g.quota, g.places.length));
  let spare = MAX_RESULTS - taken.reduce((a, b) => a + b, 0);
  for (let i = 0; spare > 0 && i < groups.length; i++) {
    const extra = Math.min(spare, groups[i].places.length - taken[i]);
    taken[i] += extra;
    spare -= extra;
  }
  return groups.flatMap((g, i) => g.places.slice(0, taken[i]));
}

function describe(err: unknown): string {
  if (err instanceof TflError || err instanceof ServiceError) {
    return `${err.code}${err.status ? ` (${err.status})` : ""}`;
  }
  return "unexpected";
}

/** Searches TfL stops, postcodes and addresses at once. A service that fails is reported, not fatal. */
export async function searchPlaces(query: string): Promise<PlaceSearchResult> {
  const q = query.trim().replace(/\s+/g, " ");
  if (q.length < MIN_QUERY_LENGTH) return { places: [], failed: [] };

  const wantsPostcodes = looksLikePostcode(q);
  const wantsAddresses = !isPostcodeLookup(q);

  const [stops, postcodes, addresses] = await Promise.allSettled([
    searchTflStops(q),
    wantsPostcodes ? searchPostcodes(q) : Promise.resolve<Place[]>([]),
    wantsAddresses ? searchGeocoder(q) : Promise.resolve<Place[]>([]),
  ]);

  const failed: PlaceSearchSource[] = [];
  const outcome = (r: PromiseSettledResult<Place[]>, source: PlaceSearchSource): Place[] => {
    if (r.status === "fulfilled") return r.value;
    failed.push(source);
    console.error(`[places] ${source} failed: ${describe(r.reason)}`);
    return [];
  };

  const stopPlaces = outcome(stops, "stations");
  const postcodePlaces = outcome(postcodes, "postcodes");
  const geocoded = outcome(addresses, "addresses").filter((p) => !isDuplicateOf(p, stopPlaces));

  const stations = stopPlaces.filter((p) => p.kind === "station");
  const busStops = stopPlaces.filter((p) => p.kind === "bus-stop");

  const groups: Group[] = wantsPostcodes && postcodePlaces.length
    ? [
        { places: postcodePlaces, quota: 3 },
        { places: stations, quota: 3 },
        { places: busStops, quota: 1 },
        { places: geocoded, quota: 3 },
      ]
    : [
        { places: stations, quota: 3 },
        { places: busStops, quota: 2 },
        { places: postcodePlaces, quota: 2 },
        { places: geocoded, quota: 3 },
      ];

  return { places: share(groups), failed };
}
