import "server-only";

import { TflError, tflGet } from "./tfl-client";
import type { LineStatus, LineStatusResult, ServiceLevel, TransportProvider } from "./types";

const STATUS_MODES = "tube,elizabeth-line,dlr,overground,tram";
const STATUS_REVALIDATE_SECONDS = 60;

interface TflLineStatusItem {
  statusSeverity: number;
  statusSeverityDescription: string;
  reason?: string;
}

interface TflLine {
  name: string;
  modeName: string;
  lineStatuses?: TflLineStatusItem[];
}

/** TfL statusSeverity codes grouped by how we style them. Unlisted codes become "unknown". */
const LEVEL_BY_SEVERITY: Record<number, ServiceLevel> = {
  10: "good",
  18: "good",
  0: "minor",
  9: "minor",
  12: "minor",
  13: "minor",
  14: "minor",
  17: "minor",
  19: "minor",
  6: "severe",
  7: "severe",
  8: "severe",
  15: "severe",
  1: "closure",
  2: "closure",
  3: "closure",
  4: "closure",
  5: "closure",
  11: "closure",
  16: "closure",
  20: "closure",
};

/** Higher is worse. "unknown" ranks above "good" so an unrecognised status is never hidden. */
const RANK: Record<ServiceLevel, number> = { good: 0, unknown: 1, minor: 2, severe: 3, closure: 4 };

const MODE_ORDER = ["tube", "elizabeth-line", "dlr", "overground", "tram"];

/** "Hammersmith & City line" and "Hammersmith and City Line" both become "hammersmith and city". */
function normaliseLineName(name: string): string {
  return name.toLowerCase().replace(/&/g, "and").replace(/\s+line$/, "").replace(/\s+/g, " ").trim();
}

/** Removes a leading "Central Line: " style prefix, since the line name is already shown. */
function stripLinePrefix(reason: string, lineName: string): string {
  const match = /^([^:]{1,40}):\s+(\S[\s\S]*)$/.exec(reason);
  if (match && normaliseLineName(match[1]) === normaliseLineName(lineName)) return match[2];
  return reason;
}

function toLineStatus(line: TflLine): LineStatus | undefined {
  const items = line.lineStatuses ?? [];
  if (!line.name || items.length === 0) return undefined;

  const withLevel = items.map((item) => ({ item, level: LEVEL_BY_SEVERITY[item.statusSeverity] ?? "unknown" }));
  const worst = withLevel.reduce((a, b) => (RANK[b.level] > RANK[a.level] ? b : a));

  const reasons = [
    ...new Set(
      withLevel
        .map((s) => s.item.reason?.trim())
        .filter((r): r is string => !!r)
        .map((r) => stripLinePrefix(r, line.name)),
    ),
  ];

  return {
    // The app calls it "Elizabeth", TfL calls it "Elizabeth line".
    line: line.name === "Elizabeth line" ? "Elizabeth" : line.name,
    level: worst.level,
    statusLabel: worst.item.statusSeverityDescription || "Status unavailable",
    message: reasons.length ? reasons.join(" ") : undefined,
  };
}

function modeRank(mode: string): number {
  const i = MODE_ORDER.indexOf(mode);
  return i === -1 ? MODE_ORDER.length : i;
}

export const tflProvider: Pick<TransportProvider, "getLineStatus"> = {
  async getLineStatus(): Promise<LineStatusResult> {
    try {
      const { data, fetchedAt } = await tflGet<TflLine[]>(`/Line/Mode/${STATUS_MODES}/Status`, {
        revalidate: STATUS_REVALIDATE_SECONDS,
      });
      if (!Array.isArray(data)) throw new TflError("bad-response");

      // Disrupted lines first, most severe first; then by mode and name.
      const statuses = data
        .slice()
        .sort((a, b) => modeRank(a.modeName) - modeRank(b.modeName) || a.name.localeCompare(b.name, "en-GB"))
        .map((line) => ({ line, status: toLineStatus(line) }))
        .filter((s): s is { line: TflLine; status: LineStatus } => !!s.status)
        .sort((a, b) => RANK[b.status.level] - RANK[a.status.level])
        .map((s) => s.status);
      if (statuses.length === 0) throw new TflError("bad-response");

      return { ok: true, source: "live", updatedAt: fetchedAt, statuses };
    } catch (err) {
      const code = err instanceof TflError ? err.code : "unexpected";
      console.error(`[tfl] line status failed: ${code}${err instanceof TflError && err.status ? ` (${err.status})` : ""}`);
      return { ok: false, reason: code === "not-configured" ? "not-configured" : "unavailable" };
    }
  },
};
