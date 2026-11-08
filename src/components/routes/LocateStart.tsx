"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { CURRENT_LOCATION, routesHref, searchHref, type Endpoint } from "@/lib/journey";
import type { JourneyOptions } from "@/lib/transport/types";

type Status = "asking" | "denied" | "unavailable";

const MESSAGE: Record<Exclude<Status, "asking">, string> = {
  denied: "Your browser didn’t share your location, so we can’t start from where you are.",
  unavailable: "We couldn’t work out where you are just now.",
};

/** Asks the browser where the user is, then opens the routes with that as the start. Nothing is stored. */
export function LocateStart({ to, options }: { to: Endpoint; options: JourneyOptions }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("asking");
  const started = useRef(false);

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("unavailable");
      return;
    }
    setStatus("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here: Endpoint = { name: CURRENT_LOCATION, lat: pos.coords.latitude, lon: pos.coords.longitude, current: true };
        router.replace(routesHref(here, to, options));
      },
      (err) => setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable"),
      { timeout: 10_000, maximumAge: 60_000 },
    );
  }, [router, to, options]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    locate();
  }, [locate]);

  return (
    <>
      <TopBar title="Routes" backHref="/" />
      <div className="notice" role="status">
        {status === "asking" ? (
          <>
            <b>Finding your location…</b>
            Your browser may ask for permission. We use it only to plan this journey.
          </>
        ) : (
          <>
            <b>{MESSAGE[status]}</b>
            <button type="button" onClick={locate}>
              Try again
            </button>
            <Link href={searchHref(undefined, to, "from")}>Choose a start place instead</Link>
          </>
        )}
      </div>
    </>
  );
}
