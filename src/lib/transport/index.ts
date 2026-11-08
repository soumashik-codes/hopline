import "server-only";

import { sampleProvider } from "./sample-provider";
import { tflProvider } from "./tfl-provider";
import type { JourneyQuery, TransportProvider } from "./types";

// The active data source. Journeys and line status are live from TfL; nearby departures are still sample data.
// Place search is live and lives in place-search.ts, because it combines several services.
const provider: TransportProvider = { ...sampleProvider, ...tflProvider };

export { searchPlaces } from "./place-search";

export function getJourneys(query: JourneyQuery) {
  return provider.getJourneys(query);
}

export function getLineStatus() {
  return provider.getLineStatus();
}

export function getNearbyDepartures() {
  return provider.getNearbyDepartures();
}

export type * from "./types";
