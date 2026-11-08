import { LINE_STATUS, NEARBY_DEPARTURES } from "./sample-data";
import type { TransportProvider } from "./types";

/** Serves the prototype's sample data for the parts that aren't live yet. Journeys are never sampled. */
export const sampleProvider: Omit<TransportProvider, "getJourneys"> = {
  async getLineStatus() {
    return { ok: true, source: "sample", statuses: LINE_STATUS };
  },
  async getNearbyDepartures() {
    return NEARBY_DEPARTURES;
  },
};
