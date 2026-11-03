import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RoutesView } from "@/components/routes/RoutesView";
import { CURRENT_LOCATION, firstParam } from "@/lib/journey";
import { getAlternatives, getRoutes } from "@/lib/transport";

export const metadata: Metadata = { title: "Routes – Hopline" };

export default async function RoutesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const from = firstParam(params.from) || CURRENT_LOCATION;
  const to = firstParam(params.to);
  if (!to) redirect(`/search?${new URLSearchParams({ from, field: "to" })}`);

  const [routes, alternatives] = await Promise.all([getRoutes({ from, to }), getAlternatives({ from, to })]);
  return <RoutesView from={from} to={to} routes={routes} alternatives={alternatives} />;
}
