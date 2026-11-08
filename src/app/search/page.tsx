import type { Metadata } from "next";
import { SearchView } from "@/components/search/SearchView";
import { CURRENT_LOCATION, firstParam } from "@/lib/journey";

export const metadata: Metadata = { title: "Plan a journey – Hopline" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const from = firstParam(params.from) || CURRENT_LOCATION;
  const to = firstParam(params.to);
  const field = firstParam(params.field) === "from" ? "from" : "to";
  const set = firstParam(params.set);
  const setting = set === "home" || set === "work" ? set : undefined;
  return <SearchView initialFrom={from} initialTo={setting ? "" : to} initialField={field} setting={setting} />;
}
