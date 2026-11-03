import type { Metadata } from "next";
import { SavedView } from "@/components/saved/SavedView";

export const metadata: Metadata = { title: "Saved – Hopline" };

export default function SavedPage() {
  return <SavedView />;
}
