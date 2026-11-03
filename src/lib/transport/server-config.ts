import "server-only";

/**
 * Server-only settings. TFL_APP_KEY must never be prefixed with NEXT_PUBLIC_
 * and this module must never be imported from a client component.
 */
export function getTflAppKey(): string | undefined {
  return process.env.TFL_APP_KEY || undefined;
}
