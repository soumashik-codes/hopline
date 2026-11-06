import "server-only";

import { getTflAppKey } from "./server-config";

const BASE_URL = "https://api.tfl.gov.uk";
const TIMEOUT_MS = 8_000;

export type TflErrorCode = "not-configured" | "timeout" | "http" | "bad-response";

/** Carries a code only, never the URL or key, so it is safe to log. */
export class TflError extends Error {
  constructor(
    readonly code: TflErrorCode,
    readonly status?: number,
  ) {
    super(status ? `TfL ${code} (${status})` : `TfL ${code}`);
    this.name = "TflError";
  }
}

export interface TflResponse<T> {
  data: T;
  /** ISO time TfL produced the response (its Date header), or undefined if missing or invalid. */
  fetchedAt?: string;
}

/**
 * The one place the app talks to the TfL Unified API. Server-only: the key is sent in a
 * header, so it never appears in URLs, cache keys or logs. Only 200 responses are cached.
 */
export async function tflGet<T>(path: string, options: { revalidate: number }): Promise<TflResponse<T>> {
  const key = getTflAppKey();
  if (!key) throw new TflError("not-configured");

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { app_key: key, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: options.revalidate },
    });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    throw new TflError(timedOut ? "timeout" : "http");
  }

  if (!res.ok) throw new TflError("http", res.status);

  let data: T;
  try {
    data = (await res.json()) as T;
  } catch {
    throw new TflError("bad-response");
  }

  const date = new Date(res.headers.get("date") ?? "");
  return { data, fetchedAt: Number.isNaN(date.getTime()) ? undefined : date.toISOString() };
}
