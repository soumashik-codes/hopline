// Small URL helpers shared by server and client code. Journey state lives in the query string.

export const CURRENT_LOCATION = "Current location";

export function journeyQuery(from: string, to: string): string {
  return new URLSearchParams({ from, to }).toString();
}

export function routesHref(from: string, to: string): string {
  return `/routes?${journeyQuery(from, to)}`;
}

export function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}
