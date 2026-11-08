import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LinePill } from "@/components/LinePill";
import { RouteStrip } from "@/components/RouteStrip";
import { LegStops } from "@/components/routes/LegStops";
import { TopBar } from "@/components/TopBar";
import { stepFreeNote } from "@/lib/accessibility";
import { CURRENT_ENDPOINT, detailParams, isResolved, parseEndpoint, parseOptions, routesHref, searchHref } from "@/lib/journey";
import { clockOf, dayLabel, londonNow } from "@/lib/london-time";
import { getJourneys } from "@/lib/transport";
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
  const from = parseEndpoint(sp, "from") ?? CURRENT_ENDPOINT;
  const to = parseEndpoint(sp, "to");
  if (!to) notFound();
  const options = parseOptions(sp);
  if (!isResolved(from) || !isResolved(to)) redirect(searchHref(from, to, "to"));

  const backHref = routesHref(from, to, { ...options, by: undefined });
  const result = await getJourneys({ from, to, ...options });

  if (!result.ok) {
    return (
      <>
        <TopBar title="Your route" backHref={backHref} />
        <div className="notice" role="alert">
          <b>We couldn’t get this journey from TfL just now.</b>
          <Link href={backHref}>Back to journeys</Link>
        </div>
      </>
    );
  }

  const journey = result.journeys.find((j) => j.id === id);
  if (!journey) {
    return (
      <>
        <TopBar title="Your route" backHref={backHref} />
        <div className="notice" role="status">
          <b>This journey has changed or is no longer offered.</b>
          TfL updates journeys all the time.
          <br />
          <Link href={backHref}>Back to journeys</Link>
        </div>
      </>
    );
  }

  const now = londonNow();
  const when = (t: string) => {
    const day = dayLabel(t, now);
    return day === "Today" ? clockOf(t) : `${day} ${clockOf(t)}`;
  };
  const changes = journey.changes === 0 ? "no changes" : `${journey.changes} change${journey.changes > 1 ? "s" : ""}`;
  const disrupted = journey.legs.some((l) => l.disruptions.length > 0);

  return (
    <>
      <TopBar title="Your route" backHref={backHref} />
      <section className="summary" aria-label="Summary">
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span className="dur">{journey.mins} min</span>
          <span style={{ flex: 1 }} />
          <b>
            {journey.fare === undefined ? (
              "Fare not available"
            ) : (
              <>
                <span className="visually-hidden">Fare </span>£{journey.fare.toFixed(2)}
              </>
            )}
          </b>
        </div>
        <small>
          Leave {when(journey.departs)}, arrive {when(journey.arrives)} · {changes}
          {options.stepFree === "train" ? " · planned as step-free to the train" : ""}
          {options.stepFree === "platform" ? " · planned as step-free to the platform" : ""}
        </small>
        <RouteStrip legs={journey.legs} />
      </section>
      {disrupted && (
        <p className="notice" role="note">
          <b>
            <span aria-hidden="true">⚠ </span>TfL reports disruption on this journey. Details are under the affected steps.
          </b>
        </p>
      )}

      <h2 className="visually-hidden">Steps</h2>
      <ol className="tl">
        {journey.legs.map((leg, i) => {
          const colour = leg.type === "ride" ? getLineInfo(leg.line).colour : undefined;
          return (
            <li key={i} className="step" style={colour ? ({ "--c": colour } as React.CSSProperties) : undefined}>
              <div className="t">{clockOf(leg.departs)}</div>
              <div className={leg.type === "walk" ? "rail walk" : "rail"} aria-hidden="true">
                <i />
              </div>
              <div className="body">
                {leg.type === "walk" ? (
                  <>
                    <b>{leg.label}</b>
                    <small>
                      {leg.mins === 0 ? "Less than a minute" : `${leg.mins} min`}
                      {leg.distance ? ` · ${leg.distance}` : ""}
                    </small>
                  </>
                ) : (
                  <>
                    <b>
                      <LinePill line={leg.line} busNumber={leg.busNumber} /> {leg.from}
                    </b>
                    <small>
                      {leg.label}
                      {leg.detail ? ` ${leg.detail}` : ""}
                      {leg.platform ? ` · ${leg.platform}` : ""}
                    </small>
                    <br />
                    <small>
                      Ride {leg.mins} min to <b>{leg.to}</b>, arriving {clockOf(leg.arrives)}
                    </small>
                    <LegStops stops={leg.stops} from={leg.from} to={leg.to} />
                    {leg.station && (
                      <ul className="access" aria-label={`Step-free access for ${leg.label}`}>
                        <li>
                          <b>{leg.from}:</b> {stepFreeNote(options.stepFree, leg.boardAccess)}
                        </li>
                        <li>
                          <b>{leg.to}:</b> {stepFreeNote(options.stepFree, leg.alightAccess)}
                        </li>
                      </ul>
                    )}
                  </>
                )}
                {leg.disruptions.map((d) => (
                  <p key={d} className="note" role="note">
                    <span aria-hidden="true">⚠ </span>
                    <span className="visually-hidden">Disruption: </span>
                    {d}
                  </p>
                ))}
              </div>
            </li>
          );
        })}
        <li className="step">
          <div className="t">{clockOf(journey.arrives)}</div>
          <div className="rail end" style={{ "--c": "var(--ink)" } as React.CSSProperties} aria-hidden="true">
            <i />
          </div>
          <div className="body">
            <b>{to.name}</b>
            <small>You’ve arrived</small>
          </div>
        </li>
      </ol>
      <div className="go">
        <Link className="primary" href={`/routes/${journey.id}/go?${detailParams(from, to, options, journey.departs)}`}>
          Start journey
        </Link>
      </div>
    </>
  );
}
