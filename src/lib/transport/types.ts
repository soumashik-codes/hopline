// Shared transport types. Providers (TfL, plus sample data for nearby departures) must return these shapes.

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

/** A place as the journey planner needs it: a name to show and a point to route from or to. */
export interface PlaceRef {
  name: string;
  lat: number;
  lon: number;
  /** TfL StopPoint id. When present TfL plans from the stop itself rather than the nearest point. */
  tflId?: string;
}

/** "YYYY-MM-DDTHH:mm" in London time, which is how TfL writes times and how a datetime-local input does. */
export type LondonTime = string;

export type JourneyTiming = { mode: "now" } | { mode: "leave" | "arrive"; at: LondonTime };

export type JourneyPreference = "fastest" | "fewest-changes" | "least-walking";

/** "platform": step-free from the street to the platform. "train": all the way onto the train. */
export type StepFreeLevel = "platform" | "train";

/** Walking or cycling the whole way, which TfL plans as journeys of their own. */
export type TravelBy = "walking" | "cycling";

export interface JourneyOptions {
  timing: JourneyTiming;
  preference: JourneyPreference;
  stepFree?: StepFreeLevel;
  /** Buses and walking only. */
  busOnly: boolean;
  /** Plan on foot or by bike only. Other options are then ignored. */
  by?: TravelBy;
}

interface LegBase {
  mins: number;
  departs: LondonTime;
  arrives: LondonTime;
  from: string;
  to: string;
  /** TfL's own wording for problems on this leg. Empty when TfL reports none. */
  disruptions: string[];
}

/** A leg on foot, or by bike when `travel` is "cycling". */
export interface WalkLeg extends LegBase {
  type: "walk";
  travel: TravelBy;
  label: string;
  /** "250 m". Absent when TfL gives no distance. */
  distance?: string;
}

export interface RideLeg extends LegBase {
  type: "ride";
  /** Line name as known to lines.ts, e.g. "Metropolitan", "Bus", "Chiltern". */
  line: string;
  label: string;
  /** "towards Aldgate". Empty when TfL gives no direction. */
  detail: string;
  /** Names of the stops between `from` and `to` (both excluded), in travel order. Empty when there are none. */
  stops: string[];
  /** Platform or bus stop letter, only when TfL gives one. */
  platform?: string;
  /** Route number for buses, e.g. "223". */
  busNumber?: string;
  /** True for trains, trams and the Tube, false for buses. Step-free wording only applies to these. */
  station: boolean;
  /** What TfL says about getting around at each end (lifts, stairs and so on). Empty when it says nothing. */
  boardAccess: string[];
  alightAccess: string[];
}

export type Leg = WalkLeg | RideLeg;

export interface Journey {
  /** Stable for the same departure and arrival times, so a detail page can find the journey again. */
  id: string;
  departs: LondonTime;
  arrives: LondonTime;
  mins: number;
  /** Fare in pounds. Absent when TfL gives none; we never estimate one. */
  fare?: number;
  changes: number;
  legs: Leg[];
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

export interface JourneyQuery extends JourneyOptions {
  from: PlaceRef;
  to: PlaceRef;
}

export type JourneyResult =
  | {
      ok: true;
      journeys: Journey[];
      /** Walking or cycling the whole way, only when TfL returned one. */
      alternatives: { by: TravelBy; journey: Journey }[];
      /** ISO time TfL produced the answer. Absent when it doesn't say. */
      updatedAt?: string;
    }
  | { ok: false; reason: "not-configured" | "unavailable" };

/** Everything the app needs from a city's transport data source. */
export interface TransportProvider {
  getJourneys(query: JourneyQuery): Promise<JourneyResult>;
  getLineStatus(): Promise<LineStatusResult>;
  getNearbyDepartures(): Promise<Departure[]>;
}
