import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GoView } from "@/components/routes/GoView";
import { CURRENT_LOCATION, firstParam } from "@/lib/journey";
import { getRoute } from "@/lib/transport";

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
  const from = firstParam(sp.from) || CURRENT_LOCATION;
  const to = firstParam(sp.to);
  const route = await getRoute(id, { from, to });
  if (!route || !to) notFound();
  return <GoView route={route} />;
}
