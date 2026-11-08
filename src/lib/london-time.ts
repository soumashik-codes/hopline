// London wall-clock time as "YYYY-MM-DDTHH:mm". TfL writes times this way and so does a datetime-local input.
import type { LondonTime } from "@/lib/transport/types";

const LONDON_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export function isLondonTime(value: string): value is LondonTime {
  return LONDON_TIME_PATTERN.test(value) && !Number.isNaN(Date.parse(`${value}:00Z`));
}

/** Now in London, to the minute. */
export function londonNow(date: Date = new Date()): LondonTime {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** "08:30". */
export function clockOf(time: LondonTime): string {
  return time.slice(11, 16);
}

/** "Today", "Tomorrow" or "Mon 9 Nov", compared with `now`. */
export function dayLabel(time: LondonTime, now: LondonTime): string {
  const day = (t: LondonTime) => Date.parse(`${t.slice(0, 10)}T00:00:00Z`);
  const diff = Math.round((day(time) - day(now)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return new Date(day(time)).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

/** "Today 08:30" for a time on `now`'s date, otherwise "Mon 9 Nov 08:30". */
export function describeTime(time: LondonTime, now: LondonTime): string {
  return `${dayLabel(time, now)} ${clockOf(time)}`;
}
