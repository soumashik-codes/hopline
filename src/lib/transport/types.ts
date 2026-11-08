// Shared transport types. Providers (sample data today, TfL later) must return these shapes.

export type PlaceKind = "station" | "bus-stop" | "postcode" | "address" | "place";

/**
 * A place the user can pick. Carries everything the journey planner needs, so it is stored
 * as a whole (recents, Home, Work) rather than as a name.
 */
export interface Place {
  /** Stable key: the TfL id for stations and stops, otherwise built from the postcode or coordinates. */
  id: string;
  name: string;
  /** Short extra text: modes for a station, direction for a bus stop, area or address for the rest. */
  detail: string;
  kind: PlaceKind;
  lat: number;
  lon: number;
  /** TfL StopPoint id, for stations and bus stops only. */
  tflId?: string;
  /** TfL mode ids serving a station, e.g. "tube", "national-rail". */
  modes?: string[];
  /** Names of the lines serving a station. Absent when TfL's answer was unavailable. */
  lines?: string[];
  /** The sign on a bus stop, e.g. "Stop PA". Absent for stops without one or when TfL's answer was unavailable. */
  indicator?: string;
}

export type PlaceSearchSource = "stations" | "postcodes" | "addresses";

export interface PlaceSearchResult {
  places: Place[];
  /** Services that failed. The places above came from the others. */
  failed: PlaceSearchSource[];
  /** True when the caller is searching too fast and was turned away. */
  limited?: boolean;
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
  getRoutes(query: JourneyQuery): Promise<Route[]>;
  getAlternatives(query: JourneyQuery): Promise<Alternative[]>;
  getLineStatus(): Promise<LineStatusResult>;
  getNearbyDepartures(): Promise<Departure[]>;
}
