import type { Metadata } from "next";
import { connection } from "next/server";
import { TopBar } from "@/components/TopBar";
import { getLineStatus } from "@/lib/transport";
import { getLineInfo } from "@/lib/transport/lines";
import type { ServiceLevel } from "@/lib/transport/types";

export const metadata: Metadata = { title: "Line status – Hopline" };

const BADGE_CLASS: Record<ServiceLevel, string> = {
  good: "badge good",
  minor: "badge warn",
  severe: "badge bad",
  closure: "badge bad",
  unknown: "badge neutral",
};

const LONDON_TIME = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

export default async function StatusPage() {
  // Always render on request, so the build never calls TfL. TfL responses are cached for 60 seconds in the client.
  await connection();
  const result = await getLineStatus();

  if (!result.ok) {
    return (
      <>
        <TopBar title="Line status" />
        <div className="empty" role="status">
          <p>
            <b>We can’t show live line status right now.</b>
          </p>
          <p>
            {result.reason === "not-configured"
              ? "Hopline isn’t connected to TfL at the moment."
              : "We couldn’t reach TfL."}{" "}
            Please try again in a minute, or check tfl.gov.uk before you travel.
          </p>
        </div>
      </>
    );
  }

  const updated = result.updatedAt ? new Date(result.updatedAt) : undefined;

  return (
    <>
      <TopBar title="Line status" />
      {updated && (
        <p className="foot" style={{ padding: "0 18px 4px", textAlign: "left" }}>
          Updated at <time dateTime={updated.toISOString()}>{LONDON_TIME.format(updated)}</time>
        </p>
      )}
      <ul className="list status" style={{ marginTop: 4 }}>
        {result.statuses.map((s) => {
          const info = getLineInfo(s.line);
          return (
            <li key={s.line} className="row">
              <span className="lbar" style={{ background: info.colour }} aria-hidden="true" />
              <span className="meta">
                <b>{info.spoken}</b>
                <span className={BADGE_CLASS[s.level]}>{s.statusLabel}</span>
                {s.message && <small>{s.message}</small>}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="foot">
        {result.source === "sample" ? "Sample statuses for this prototype." : "Powered by TfL Open Data"}
      </p>
    </>
  );
}
