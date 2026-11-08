// Place helpers shared by server and client code. Plain data and functions, no secrets.
import type { IconName } from "@/components/Icon";
import type { Place, PlaceKind } from "@/lib/transport/types";

export const MIN_QUERY_LENGTH = 3;
export const MAX_RESULTS = 8;

export const PLACE_KIND_LABEL: Record<PlaceKind, string> = {
  station: "Station",
  "bus-stop": "Bus stop",
  postcode: "Postcode",
  address: "Address",
  place: "Place",
};

export function placeIcon(place: Place): IconName {
  if (place.kind === "bus-stop") return "bus";
  if (place.kind === "station") {
    const rail = place.modes?.includes("national-rail") && !place.modes.includes("tube");
    return rail ? "rail" : "tube";
  }
  return "pin";
}

/** "Station · Tube", "Bus stop · Stop PA · towards Wembley", "Postcode · Brent". */
export function placeSummary(place: Place): string {
  return [PLACE_KIND_LABEL[place.kind], place.indicator, place.detail].filter(Boolean).join(" · ");
}

const MAX_LINES_SHOWN = 6;

/** "Served by Bakerloo, Circle and 3 more" or "Bus routes 79, 204 and 1 more", or undefined when we don't know the lines. */
export function servedBy(place: Place): string | undefined {
  const lines = place.lines;
  if (!lines?.length) return undefined;
  const shown = lines.slice(0, MAX_LINES_SHOWN).join(", ");
  const more = lines.length - MAX_LINES_SHOWN;
  const prefix = place.kind === "bus-stop" ? "Bus routes" : "Served by";
  return `${prefix} ${shown}${more > 0 ? ` and ${more} more` : ""}`;
}

/** Checks data read back from storage, so old or damaged entries are dropped rather than trusted. */
export function isPlace(value: unknown): value is Place {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    typeof p.detail === "string" &&
    typeof p.kind === "string" &&
    p.kind in PLACE_KIND_LABEL &&
    typeof p.lat === "number" &&
    typeof p.lon === "number"
  );
}
