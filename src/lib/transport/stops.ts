/** "1 stop" / "3 stops". */
export function stopsLabel(count: number): string {
  return `${count} ${count === 1 ? "stop" : "stops"}`;
}
