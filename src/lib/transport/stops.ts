/** "1 stop" / "3 stops". */
export function stopsLabel(count: number): string {
  return `${count} ${count === 1 ? "stop" : "stops"}`;
}

/** "Baker Street Underground Station" becomes "Baker Street"; the mode is shown separately. */
export function stationName(name: string): string {
  return name.replace(/\s+(?:(?:Underground|DLR|Rail|Overground|Tram|Elizabeth line)\s+)*(?:Station|Stop)$/i, "").trim() || name;
}
