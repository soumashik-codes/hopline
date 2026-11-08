import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { GoView } from "@/components/routes/GoView";
import { CURRENT_ENDPOINT, detailParams, isResolved, parseEndpoint, parseOptions, searchHref } from "@/lib/journey";
import { getJourneys } from "@/lib/transport";

export const metadata: Metadata = { title: "On the way – Hopline" };

export default async function GoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const from = parseEndpoint(sp, "from") ?? CURRENT_ENDPOINT;
  const to = parseEndpoint(sp, "to");
  if (!to) notFound();
  const options = parseOptions(sp);
  if (!isResolved(from) || !isResolved(to)) redirect(searchHref(from, to, "to"));

  const result = await getJourneys({ from, to, ...options });
  const journey = result.ok ? result.journeys.find((j) => j.id === id) : undefined;
  if (!journey) notFound();
  return <GoView journey={journey} backHref={`/routes/${journey.id}?${detailParams(from, to, options, journey.departs)}`} />;
}
