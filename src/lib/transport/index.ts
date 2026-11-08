import "server-only";

import { sampleProvider } from "./sample-provider";
import { tflProvider } from "./tfl-provider";
import type { JourneyQuery, Route, TransportProvider } from "./types";

// The active data source. Line status is live from TfL; routes, alternatives and departures are still sample data.
// Place search is live and lives in place-search.ts, because it combines several services.
const provider: TransportProvider = { ...sampleProvider, ...tflProvider };

export { searchPlaces } from "./place-search";

export function getRoutes(query: JourneyQuery) {
  return provider.getRoutes(query);
}

export async function getRoute(id: string, query: JourneyQuery): Promise<Route | undefined> {
  const routes = await provider.getRoutes(query);
  return routes.find((r) => r.id === id);
}

export function getAlternatives(query: JourneyQuery) {
  return provider.getAlternatives(query);
}

export function getLineStatus() {
  return provider.getLineStatus();
}

export function getNearbyDepartures() {
  return provider.getNearbyDepartures();
}

export type * from "./types";
