import { NextResponse, type NextRequest } from "next/server";
import { searchPlaces } from "@/lib/transport";

// Place search for the browser. Runs on the server, so a future TfL key stays server-side.
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 100);
  const places = await searchPlaces(q);
  return NextResponse.json({ places });
}
