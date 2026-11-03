import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClockTime } from "@/components/ClockTime";
import { LinePill } from "@/components/LinePill";
import { RouteStrip } from "@/components/RouteStrip";
import { TopBar } from "@/components/TopBar";
import { CURRENT_LOCATION, firstParam, journeyQuery, routesHref } from "@/lib/journey";
import { getRoute } from "@/lib/transport";
import { getLineInfo } from "@/lib/transport/lines";

export const metadata: Metadata = { title: "Your route – Hopline" };

export default async function RouteDetailPage({
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

  // Running clock offset (minutes from now) at the start of each leg.
  const starts = route.legs.reduce<number[]>((acc, leg, i) => [...acc, i === 0 ? route.next[0] : acc[i - 1] + route.legs[i - 1].mins], []);
  const arrival = route.next[0] + route.legs.reduce((sum, l) => sum + l.mins, 0);
  const changes = route.changes === 0 ? "no changes" : `${route.changes} change${route.changes > 1 ? "s" : ""}`;

  return (
    <>
      <TopBar title="Your route" backHref={routesHref(from, to)} />
      <section className="summary" aria-label="Summary">
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span className="dur">{route.mins} min</span>
          <span style={{ flex: 1 }} />
          <b>
            <span className="visually-hidden">Fare </span>£{route.fare.toFixed(2)}
          </b>
        </div>
        <small>
          Leave in {route.next[0]} min, arrive <ClockTime addMinutes={route.mins + route.next[0]} /> · {changes}
          {route.stepFree ? " · step-free" : ""}
        </small>
        <RouteStrip legs={route.legs} />
      </section>

      <h2 className="visually-hidden">Steps</h2>
      <ol className="tl">
        {route.legs.map((leg, i) => {
          const colour = leg.type === "ride" ? getLineInfo(leg.line).colour : undefined;
          return (
            <li key={i} className="step" style={colour ? ({ "--c": colour } as React.CSSProperties) : undefined}>
              <div className="t">
                <ClockTime addMinutes={starts[i]} />
              </div>
              <div className={leg.type === "walk" ? "rail walk" : "rail"} aria-hidden="true">
                <i />
              </div>
              <div className="body">
                {leg.type === "walk" ? (
                  <>
                    <b>{leg.label}</b>
                    <small>
                      {leg.mins} min · {leg.detail}
                    </small>
                  </>
                ) : (
                  <>
                    <b>
                      <LinePill line={leg.line} busNumber={leg.busNumber} /> {leg.from}
                    </b>
                    <small>
                      {leg.label} {leg.detail}
                      {leg.platform ? ` · ${leg.platform}` : ""}
                    </small>
                    <br />
                    <small>
                      Ride {leg.mins} min to <b>{leg.to}</b>
                    </small>
                  </>
                )}
              </div>
            </li>
          );
        })}
        <li className="step">
          <div className="t">
            <ClockTime addMinutes={arrival} />
          </div>
          <div className="rail end" style={{ "--c": "var(--ink)" } as React.CSSProperties} aria-hidden="true">
            <i />
          </div>
          <div className="body">
            <b>{to}</b>
            <small>You’ve arrived</small>
          </div>
        </li>
      </ol>
      <div className="go">
        <Link className="primary" href={`/routes/${route.id}/go?${journeyQuery(from, to)}`}>
          Start journey
        </Link>
      </div>
    </>
  );
}
