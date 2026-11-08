import { ALTERNATIVES, LINE_STATUS, NEARBY_DEPARTURES, ROUTES } from "./sample-data";
import type { TransportProvider } from "./types";

/** Serves the prototype's sample data. Replace with a TfL provider later. */
export const sampleProvider: TransportProvider = {
  async getRoutes({ from, to }) {
    return ROUTES.map((r) => ({ ...r, from, to }));
  },
  async getAlternatives() {
    return ALTERNATIVES;
  },
  async getLineStatus() {
    return { ok: true, source: "sample", statuses: LINE_STATUS };
  },
  async getNearbyDepartures() {
    return NEARBY_DEPARTURES;
  },
};
