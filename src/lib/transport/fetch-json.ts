import "server-only";

export type ServiceErrorCode = "not-configured" | "limited" | "timeout" | "http" | "bad-response";

/** Carries a code only, never the URL or key, so it is safe to log. */
export class ServiceError extends Error {
  constructor(
    readonly service: string,
    readonly code: ServiceErrorCode,
    readonly status?: number,
  ) {
    super(status ? `${service} ${code} (${status})` : `${service} ${code}`);
    this.name = "ServiceError";
  }
}

const TIMEOUT_MS = 6_000;

/** Fetches JSON from a non-TfL service. TfL goes through tflGet instead. */
export async function fetchJson<T>(service: string, url: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    throw new ServiceError(service, timedOut ? "timeout" : "http");
  }
  if (!res.ok) throw new ServiceError(service, "http", res.status);
  try {
    return (await res.json()) as T;
  } catch {
    throw new ServiceError(service, "bad-response");
  }
}
