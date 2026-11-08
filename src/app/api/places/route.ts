import { NextResponse, type NextRequest } from "next/server";
import { searchPlaces } from "@/lib/transport";
import { isRateLimited } from "@/lib/transport/rate-limit";
import type { PlaceSearchResult } from "@/lib/transport/types";

// Place search for the browser. The browser never calls TfL, postcodes.io or Geoapify itself,
// so the keys stay on the server. Results are not cached by the browser or a CDN.
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const caller = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(caller)) {
    const body: PlaceSearchResult = { places: [], failed: [], limited: true };
    return NextResponse.json(body, { status: 429, headers: { ...NO_STORE, "Retry-After": "30" } });
  }

  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 100);
  return NextResponse.json(await searchPlaces(q), { headers: NO_STORE });
}
