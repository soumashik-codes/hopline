// Sample data copied from the design prototype (illustrative timings, not live data).
import type { Alternative, Departure, LineStatus, Place, Route } from "./types";

export const PLACES: Place[] = [
  { name: "Preston Road", description: "Underground station, Metropolitan", kind: "tube" },
  { name: "Great Portland Street", description: "Underground station, Circle, H&C, Metropolitan", kind: "tube" },
  { name: "University of Westminster", description: "309 Regent Street, London W1B 2HW", kind: "pin" },
  { name: "Wembley Park", description: "Underground station, Jubilee, Metropolitan", kind: "tube" },
  { name: "Baker Street", description: "Underground station, 5 lines", kind: "tube" },
  { name: "Oxford Circus", description: "Underground station, Bakerloo, Central, Victoria", kind: "tube" },
  { name: "Wembley Stadium", description: "Wembley, London HA9 0WS", kind: "pin" },
  { name: "King’s Cross St. Pancras", description: "Underground and rail station", kind: "rail" },
  { name: "Hammersmith", description: "Underground station", kind: "tube" },
  { name: "Bank", description: "Underground station", kind: "tube" },
  { name: "O2 Academy Brixton", description: "211 Stockwell Road, London SW9 9SL", kind: "pin" },
  { name: "Harrow-on-the-Hill", description: "Underground and rail station", kind: "rail" },
  { name: "Paddington", description: "Underground and rail station", kind: "rail" },
  { name: "Westfield London", description: "Ariel Way, London W12 7GF", kind: "pin" },
];

export const ROUTES: Omit<Route, "from" | "to">[] = [
  {
    id: "r1", tag: "Fastest", mins: 22, fare: 3.4, mode: "tube", changes: 0, stepFree: false, next: [2, 9, 16],
    legs: [
      { type: "walk", mins: 3, label: "Walk to Preston Road", detail: "250 m" },
      { type: "ride", line: "Metropolitan", mins: 17, label: "Metropolitan line", detail: "towards Aldgate · 6 stops", from: "Preston Road", to: "Great Portland Street", platform: "Platform 1" },
      { type: "walk", mins: 2, label: "Walk to destination", detail: "Exit via Euston Road" },
    ],
  },
  {
    id: "r2", tag: "Fewer stairs", mins: 34, fare: 3.4, mode: "tube", changes: 1, stepFree: true, next: [4, 11, 19],
    legs: [
      { type: "walk", mins: 6, label: "Walk to Bus stop PR", detail: "400 m" },
      { type: "ride", line: "Bus", busNumber: "223", mins: 9, label: "Bus 223", detail: "towards Wembley · 5 stops", from: "Preston Road Station", to: "Wembley Park" },
      { type: "ride", line: "Jubilee", mins: 14, label: "Jubilee line", detail: "towards Stratford · 4 stops", from: "Wembley Park", to: "Baker Street", platform: "Platform 3" },
      { type: "ride", line: "Hammersmith & City", mins: 3, label: "Hammersmith & City line", detail: "towards Barking · 1 stop", from: "Baker Street", to: "Great Portland Street" },
      { type: "walk", mins: 2, label: "Walk to destination", detail: "Step-free exit" },
    ],
  },
  {
    id: "r3", tag: "Cheapest", mins: 71, fare: 1.75, mode: "bus", changes: 1, stepFree: true, next: [2, 14, 26],
    legs: [
      { type: "walk", mins: 4, label: "Walk to stop PE", detail: "300 m" },
      { type: "ride", line: "Bus", busNumber: "79", mins: 24, label: "Bus 79", detail: "towards Alperton · 12 stops", from: "Preston Road Station", to: "Kingsbury" },
      { type: "ride", line: "Bus", busNumber: "18", mins: 39, label: "Bus 18", detail: "towards Euston · 21 stops", from: "Harlesden", to: "Great Portland Street" },
      { type: "walk", mins: 4, label: "Walk to destination", detail: "280 m" },
    ],
  },
  {
    id: "r4", tag: "", mins: 46, fare: 5.15, mode: "rail", changes: 2, stepFree: false, next: [6, 18, 30],
    legs: [
      { type: "walk", mins: 3, label: "Walk to Preston Road", detail: "250 m" },
      { type: "ride", line: "Metropolitan", mins: 7, label: "Metropolitan line", detail: "towards Uxbridge · 2 stops", from: "Preston Road", to: "Harrow-on-the-Hill" },
      { type: "ride", line: "Chiltern", mins: 24, label: "Chiltern Railways", detail: "towards Marylebone", from: "Harrow-on-the-Hill", to: "Marylebone" },
      { type: "ride", line: "Bakerloo", mins: 6, label: "Bakerloo line", detail: "towards Elephant & Castle · 1 stop", from: "Marylebone", to: "Baker Street" },
      { type: "walk", mins: 6, label: "Walk to destination", detail: "Along Marylebone Road" },
    ],
  },
];

export const ALTERNATIVES: Alternative[] = [
  { kind: "walk", label: "Walk", mins: 171, note: "Free · 708 cal" },
  { kind: "bike", label: "Cycle", mins: 68, note: "Free · 285 cal" },
  { kind: "cab", label: "Cab", mins: 33, note: "£20+" },
];

export const LINE_STATUS: LineStatus[] = [
  { line: "Bakerloo", level: "good" },
  { line: "Central", level: "good" },
  { line: "Circle", level: "good" },
  { line: "District", level: "minor", message: "Minor delays between Earl’s Court and Wimbledon" },
  { line: "Elizabeth", level: "good" },
  { line: "Hammersmith & City", level: "good" },
  { line: "Jubilee", level: "minor", message: "Minor delays due to an earlier signal failure at Neasden" },
  { line: "Metropolitan", level: "good" },
  { line: "Northern", level: "good" },
  { line: "Piccadilly", level: "closure", message: "Part closure: no service between Acton Town and Uxbridge" },
  { line: "Victoria", level: "good" },
];

export const NEARBY_DEPARTURES: Departure[] = [
  { line: "Metropolitan", stop: "Preston Road", direction: "towards Aldgate", mins: [2, 9] },
  { line: "Metropolitan", stop: "Preston Road", direction: "towards Uxbridge", mins: [5, 13] },
  { line: "Bus", busNumber: "223", stop: "Preston Road Station", direction: "towards Wembley", mins: [4, 24] },
  { line: "Bus", busNumber: "79", stop: "Preston Road Station", direction: "towards Alperton", mins: [7, 19] },
];
