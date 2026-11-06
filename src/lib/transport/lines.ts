// Line colours and names. Plain data with no secrets, so it is safe to import from client components.

export interface LineInfo {
  name: string;
  /** Short name shown on pills. */
  short: string;
  /** Full accessible name, e.g. "Metropolitan line". */
  spoken: string;
  colour: string;
  /** Text colour on `colour` that meets WCAG AA (4.5:1). */
  textColour: string;
}

const WHITE = "#FFFFFF";
const INK = "#13202E";

const LINES: Record<string, Omit<LineInfo, "name">> = {
  Metropolitan: { short: "Met", spoken: "Metropolitan line", colour: "#9B0056", textColour: WHITE },
  Jubilee: { short: "Jubilee", spoken: "Jubilee line", colour: "#868F98", textColour: INK },
  Bakerloo: { short: "Bakerloo", spoken: "Bakerloo line", colour: "#B06000", textColour: WHITE },
  Circle: { short: "Circle", spoken: "Circle line", colour: "#E8B800", textColour: INK },
  "Hammersmith & City": { short: "H&C", spoken: "Hammersmith & City line", colour: "#E899A8", textColour: INK },
  Elizabeth: { short: "Eliz", spoken: "Elizabeth line", colour: "#6950A1", textColour: WHITE },
  Central: { short: "Central", spoken: "Central line", colour: "#DC241F", textColour: WHITE },
  Northern: { short: "Northern", spoken: "Northern line", colour: "#2B2B2B", textColour: WHITE },
  Piccadilly: { short: "Picc", spoken: "Piccadilly line", colour: "#0019A8", textColour: WHITE },
  Victoria: { short: "Victoria", spoken: "Victoria line", colour: "#0098D8", textColour: INK },
  District: { short: "District", spoken: "District line", colour: "#007D32", textColour: WHITE },
  "Waterloo & City": { short: "W&C", spoken: "Waterloo and City line", colour: "#6BCDB2", textColour: INK },
  DLR: { short: "DLR", spoken: "Docklands Light Railway", colour: "#00A4A7", textColour: INK },
  Tram: { short: "Tram", spoken: "London Trams", colour: "#5FB526", textColour: INK },
  Liberty: { short: "Liberty", spoken: "Liberty line", colour: "#61686B", textColour: WHITE },
  Lioness: { short: "Lioness", spoken: "Lioness line", colour: "#FFA32B", textColour: INK },
  Mildmay: { short: "Mildmay", spoken: "Mildmay line", colour: "#006FE6", textColour: WHITE },
  Suffragette: { short: "Suffragette", spoken: "Suffragette line", colour: "#18A95D", textColour: INK },
  Weaver: { short: "Weaver", spoken: "Weaver line", colour: "#9B0058", textColour: WHITE },
  Windrush: { short: "Windrush", spoken: "Windrush line", colour: "#DC241F", textColour: WHITE },
  Chiltern: { short: "Chiltern", spoken: "Chiltern Railways", colour: "#00A3E0", textColour: INK },
  Bus: { short: "Bus", spoken: "Bus", colour: "#E1251B", textColour: WHITE },
};

export function getLineInfo(name: string): LineInfo {
  const info = LINES[name];
  if (info) return { name, ...info };
  return { name, short: name.slice(0, 3), spoken: name, colour: "#555555", textColour: WHITE };
}
