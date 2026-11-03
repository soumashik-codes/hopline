import "server-only";

import { sampleProvider } from "./sample-provider";
import type { JourneyQuery, Route, TransportProvider } from "./types";

// The active data source. Swap this for a TfL (or other city) provider later.
const provider: TransportProvider = sampleProvider;

export function searchPlaces(query: string) {
  return provider.searchPlaces(query);
}

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
