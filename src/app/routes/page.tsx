import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LocateStart } from "@/components/routes/LocateStart";
import { RoutesView } from "@/components/routes/RoutesView";
import { CURRENT_ENDPOINT, isResolved, parseEndpoint, parseOptions, searchHref } from "@/lib/journey";
import { londonNow } from "@/lib/london-time";
import { getJourneys } from "@/lib/transport";

export const metadata: Metadata = { title: "Routes – Hopline" };

export default async function RoutesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const from = parseEndpoint(params, "from") ?? CURRENT_ENDPOINT;
  const to = parseEndpoint(params, "to");
  // A link with no usable destination (including old links that held only names) goes back to choosing one.
  if (!to || !isResolved(to)) redirect(searchHref(from, undefined, "to"));

  const options = parseOptions(params);
  if (!isResolved(from)) return <LocateStart to={to} options={options} />;

  const result = await getJourneys({ from, to, ...options });
  return <RoutesView from={from} to={to} options={options} result={result} now={londonNow()} />;
}
