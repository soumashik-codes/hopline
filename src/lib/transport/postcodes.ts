import "server-only";

import { fetchJson, ServiceError } from "./fetch-json";
import type { Place } from "./types";

const BASE_URL = "https://api.postcodes.io";
const REVALIDATE_SECONDS = 60 * 60 * 24;
const MAX_SUGGESTIONS = 3;

const FULL = /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/;
const DISTRICT = /^[A-Z]{1,2}\d[A-Z\d]?$/;
const PARTIAL = /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{0,2}$/;

/** Upper case with no spaces, so "ha9 0wS" and "HA90WS" compare equal. */
function compact(query: string): string {
  return query.toUpperCase().replace(/\s+/g, "");
}

/**
 * True when the query is a whole postcode or the start of one with a space, such as "HA9 0".
 * postcodes.io answers these exactly, so there is no need to spend a geocoding credit on them.
 */
export function isPostcodeLookup(query: string): boolean {
  const q = compact(query);
  return FULL.test(q) || (/\s/.test(query.trim()) && PARTIAL.test(q));
}

/** True for a whole postcode, a district such as "HA9", or the start of a postcode such as "HA9 0". */
export function looksLikePostcode(query: string): boolean {
  const q = compact(query);
  return FULL.test(q) || DISTRICT.test(q) || PARTIAL.test(q);
}

function format(postcode: string): string {
  const p = compact(postcode);
  return `${p.slice(0, -3)} ${p.slice(-3)}`;
}

interface PostcodeResult {
  postcode: string;
  latitude: number | null;
  longitude: number | null;
  admin_district?: string[] | string | null;
}

interface OutcodeResult {
  outcode: string;
  latitude: number | null;
  longitude: number | null;
  admin_district?: string[] | null;
}

function area(value: string[] | string | null | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function toPlace(r: PostcodeResult): Place | undefined {
  if (typeof r.latitude !== "number" || typeof r.longitude !== "number") return undefined;
  const name = format(r.postcode);
  return { id: `postcode:${compact(name)}`, name, detail: area(r.admin_district), kind: "postcode", lat: r.latitude, lon: r.longitude };
}

/** A postcode that doesn't exist is an empty answer, not a failure. */
async function orEmpty<T>(request: Promise<T>, empty: T): Promise<T> {
  try {
    return await request;
  } catch (err) {
    if (err instanceof ServiceError && err.status === 404) return empty;
    throw err;
  }
}

export async function searchPostcodes(query: string): Promise<Place[]> {
  const q = compact(query);
  const options = { next: { revalidate: REVALIDATE_SECONDS } };

  if (FULL.test(q)) {
    const body = await orEmpty(
      fetchJson<{ result: PostcodeResult | null }>("postcodes.io", `${BASE_URL}/postcodes/${q}`, options),
      { result: null },
    );
    const place = body.result && toPlace(body.result);
    return place ? [place] : [];
  }

  // "HA9" is a district; "HA9 0" (with a space) is the start of a full postcode.
  const spaced = /\s/.test(query.trim());
  if (!spaced && DISTRICT.test(q)) {
    const body = await orEmpty(
      fetchJson<{ result: OutcodeResult | null }>("postcodes.io", `${BASE_URL}/outcodes/${q}`, options),
      { result: null },
    );
    const r = body.result;
    if (!r || typeof r.latitude !== "number" || typeof r.longitude !== "number") return [];
    const where = area(r.admin_district);
    return [
      {
        id: `outcode:${r.outcode}`,
        name: r.outcode,
        detail: `Postcode district, centre of the area${where ? `, ${where}` : ""}`,
        kind: "postcode",
        lat: r.latitude,
        lon: r.longitude,
      },
    ];
  }

  // Part of a full postcode, such as "HA9 0": ask for matching postcodes, then look up where they are.
  const suggestions = await fetchJson<{ result: string[] | null }>(
    "postcodes.io",
    `${BASE_URL}/postcodes/${encodeURIComponent(query.trim().toUpperCase().replace(/\s+/g, " "))}/autocomplete?limit=${MAX_SUGGESTIONS}`,
    options,
  );
  const codes = suggestions.result ?? [];
  if (codes.length === 0) return [];

  const found = await fetchJson<{ result: { result: PostcodeResult | null }[] | null }>("postcodes.io", `${BASE_URL}/postcodes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postcodes: codes }),
    next: { revalidate: REVALIDATE_SECONDS },
  });
  return (found.result ?? []).flatMap((item) => {
    const place = item.result && toPlace(item.result);
    return place ? [place] : [];
  });
}
