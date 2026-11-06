// Shared transport types. Providers (sample data today, TfL later) must return these shapes.

export type PlaceKind = "tube" | "rail" | "pin";

export interface Place {
  name: string;
  description: string;
  kind: PlaceKind;
}

export interface WalkLeg {
  type: "walk";
  mins: number;
  label: string;
  detail: string;
}

export interface RideLeg {
  type: "ride";
  /** Line name as known to lines.ts, e.g. "Metropolitan", "Bus", "Chiltern". */
  line: string;
  mins: number;
  label: string;
  detail: string;
  from: string;
  to: string;
  /** Names of the stops between `from` and `to` (both excluded), in travel order. Empty when there are none. */
  stops: string[];
  platform?: string;
  /** Route number for buses, e.g. "223". */
  busNumber?: string;
}

export type Leg = WalkLeg | RideLeg;

export type RouteMode = "tube" | "bus" | "rail";

export interface Route {
  id: string;
  tag: string;
  mins: number;
  /** Fare in pounds. */
  fare: number;
  mode: RouteMode;
  changes: number;
  stepFree: boolean;
  /** Minutes until the next three departures. */
  next: number[];
  legs: Leg[];
  from: string;
  to: string;
}

export type AlternativeKind = "walk" | "bike" | "cab";

export interface Alternative {
  kind: AlternativeKind;
  label: string;
  mins: number;
  note: string;
}

export interface Departure {
  line: string;
  busNumber?: string;
  stop: string;
  direction: string;
  /** Minutes until this and the following departure. */
  mins: [number, number];
}

export type ServiceLevel = "good" | "minor" | "severe" | "closure" | "unknown";

export interface LineStatus {
  line: string;
  level: ServiceLevel;
  /** Wording shown to users, e.g. "Good service". Live data uses TfL's own wording. */
  statusLabel: string;
  /** Why the line is disrupted, when the data source says. */
  message?: string;
}

export type LineStatusResult =
  | {
      ok: true;
      source: "live" | "sample";
      /** ISO time the data was produced. Absent when the source doesn't say. */
      updatedAt?: string;
      statuses: LineStatus[];
    }
  | { ok: false; reason: "not-configured" | "unavailable" };

export interface JourneyQuery {
  from: string;
  to: string;
}

/** Everything the app needs from a city's transport data source. */
export interface TransportProvider {
  searchPlaces(query: string): Promise<Place[]>;
  getRoutes(query: JourneyQuery): Promise<Route[]>;
  getAlternatives(query: JourneyQuery): Promise<Alternative[]>;
  getLineStatus(): Promise<LineStatusResult>;
  getNearbyDepartures(): Promise<Departure[]>;
}
