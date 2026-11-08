// Sample data copied from the design prototype (illustrative timings, not live data).
// Only nearby departures still use it; journeys come live from TfL.
import type { Departure, LineStatus } from "./types";

export const LINE_STATUS: LineStatus[] = [
  { line: "Bakerloo", level: "good", statusLabel: "Good service" },
  { line: "Central", level: "good", statusLabel: "Good service" },
  { line: "Circle", level: "good", statusLabel: "Good service" },
  { line: "District", level: "minor", statusLabel: "Minor delays", message: "Minor delays between Earl’s Court and Wimbledon" },
  { line: "Elizabeth", level: "good", statusLabel: "Good service" },
  { line: "Hammersmith & City", level: "good", statusLabel: "Good service" },
  { line: "Jubilee", level: "minor", statusLabel: "Minor delays", message: "Minor delays due to an earlier signal failure at Neasden" },
  { line: "Metropolitan", level: "good", statusLabel: "Good service" },
  { line: "Northern", level: "good", statusLabel: "Good service" },
  { line: "Piccadilly", level: "closure", statusLabel: "Part closure", message: "Part closure: no service between Acton Town and Uxbridge" },
  { line: "Victoria", level: "good", statusLabel: "Good service" },
];

export const NEARBY_DEPARTURES: Departure[] = [
  { line: "Metropolitan", stop: "Preston Road", direction: "towards Aldgate", mins: [2, 9] },
  { line: "Metropolitan", stop: "Preston Road", direction: "towards Uxbridge", mins: [5, 13] },
  { line: "Bus", busNumber: "223", stop: "Preston Road Station", direction: "towards Wembley", mins: [4, 24] },
  { line: "Bus", busNumber: "79", stop: "Preston Road Station", direction: "towards Alperton", mins: [7, 19] },
];
