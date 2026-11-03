"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ClockTime } from "@/components/ClockTime";
import { Icon } from "@/components/Icon";
import { LegsList, RouteStrip } from "@/components/RouteStrip";
import { useToast } from "@/components/Toast";
import { TopBar } from "@/components/TopBar";
import { CURRENT_LOCATION, journeyQuery, routesHref } from "@/lib/journey";
import { useRecents, useSaved } from "@/lib/storage";
import type { Alternative, Route } from "@/lib/transport/types";

const SORTS = ["Best", "Cheapest", "Fewest changes", "Step-free", "Bus only"] as const;
type Sort = (typeof SORTS)[number];

const WHEN = ["Leave now", "Leave at 08:30", "Arrive by 09:00"];

function sortRoutes(routes: Route[], sort: Sort): Route[] {
  const r = [...routes];
  if (sort === "Cheapest") return r.sort((a, b) => a.fare - b.fare || a.mins - b.mins);
  if (sort === "Fewest changes") return r.sort((a, b) => a.changes - b.changes || a.mins - b.mins);
  if (sort === "Step-free") return r.filter((x) => x.stepFree).sort((a, b) => a.mins - b.mins);
  if (sort === "Bus only") return r.filter((x) => x.legs.every((l) => l.type === "walk" || l.line === "Bus"));
  return r.sort((a, b) => a.mins - b.mins);
}

export function RoutesView({ from, to, routes, alternatives }: { from: string; to: string; routes: Route[]; alternatives: Alternative[] }) {
  const router = useRouter();
  const toast = useToast();
  const [saved, setSaved] = useSaved();
  const [recents, setRecents] = useRecents();
  const [sort, setSort] = useState<Sort>("Best");
  const [when, setWhen] = useState(0);
  const [announcement, setAnnouncement] = useState("");

  // Remember the destination, like the prototype's plan().
  useEffect(() => {
    if (recents[0] !== to) setRecents([to, ...recents.filter((x) => x !== to)].slice(0, 6));
  }, [to, recents, setRecents]);

  const shown = sortRoutes(routes, sort);
  const offset = when === 1 ? 30 : 0;
  const countText = (n: number) => (n === 1 ? "1 route" : `${n} routes`);

  // Announce results once they arrive; the live region exists before its text changes.
  useEffect(() => {
    const id = window.setTimeout(() => setAnnouncement(`${countText(routes.length)} found from ${from} to ${to}`), 100);
    return () => window.clearTimeout(id);
  }, [routes.length, from, to]);

  function chooseSort(s: Sort) {
    setSort(s);
    setAnnouncement(`${countText(sortRoutes(routes, s).length)}, ${s === "Best" ? "best first" : s.toLowerCase()}`);
  }

  function swap() {
    const nextFrom = to || "";
    const nextTo = from === CURRENT_LOCATION ? "Preston Road" : from;
    router.replace(routesHref(nextFrom, nextTo));
  }

  function saveTrip() {
    if (saved.routes.some((t) => t.from === from && t.to === to)) {
      toast("Already saved");
      return;
    }
    setSaved({ ...saved, routes: [{ from, to }, ...saved.routes] });
    toast("Trip saved");
  }

  return (
    <>
      <TopBar title="Routes" backHref={`/search?${new URLSearchParams({ from, to, field: "to" })}`} />
      <div className="trip">
        <p className="meta" style={{ margin: 0 }}>
          <span>{from}</span>
          <span>to {to}</span>
        </p>
        <button type="button" className="iconbtn alt" aria-label="Swap start and destination" onClick={swap}>
          <Icon name="swap" />
        </button>
      </div>
      <div className="when">
        <button type="button" onClick={() => setWhen((when + 1) % WHEN.length)} aria-label={`${WHEN[when]}. Change time`}>
          <Icon name="clock" small />
          {WHEN[when]}
        </button>
        <button type="button" onClick={saveTrip}>
          <Icon name="star" small />
          Save trip
        </button>
      </div>

      <h2 className="visually-hidden">Other ways to travel</h2>
      <div className="alts">
        {alternatives.map((a) => (
          <button
            key={a.kind}
            type="button"
            onClick={() => toast(`${a.label}: about ${a.mins} min, ${a.note.split(" · ")[0]}`)}
          >
            <Icon name={a.kind} />
            <span className="visually-hidden">{a.label}</span>
            <b>
              {a.mins}
              <small> min</small>
            </b>
            <small>{a.note}</small>
          </button>
        ))}
      </div>

      <div className="sorts" role="group" aria-label="Sort and filter routes">
        {SORTS.map((s) => (
          <button key={s} type="button" aria-pressed={sort === s} onClick={() => chooseSort(s)}>
            {s}
          </button>
        ))}
      </div>

      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      <h2 className="visually-hidden">Public transport routes</h2>
      {shown.length ? (
        <ul className="plain">
          {shown.map((r) => (
            <li key={r.id}>
              <Link className="card" href={`/routes/${r.id}?${journeyQuery(from, to)}`}>
                {r.tag && <span className="tag">{r.tag}</span>}
                <div className="top">
                  <span className="dur">
                    {r.mins}
                    <small>min</small>
                  </span>
                  <span className="arr">
                    arrive <ClockTime addMinutes={r.mins + r.next[0] + offset} />
                  </span>
                  <span className="fare">£{r.fare.toFixed(2)}</span>
                </div>
                <RouteStrip legs={r.legs} />
                <LegsList legs={r.legs} />
                <div className="next">
                  Next in <b>{r.next[0]} min</b>, then {r.next[1]} and {r.next[2]}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty" style={{ margin: "0 14px" }}>
          No routes match this filter. Pick another option above.
        </p>
      )}
      <p className="foot">Times and fares are sample data for this prototype.</p>
    </>
  );
}
