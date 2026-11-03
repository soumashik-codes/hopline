import type { Metadata } from "next";
import { TopBar } from "@/components/TopBar";
import { getLineStatus } from "@/lib/transport";
import { getLineInfo } from "@/lib/transport/lines";
import type { ServiceLevel } from "@/lib/transport/types";

export const metadata: Metadata = { title: "Line status – Hopline" };

const LEVELS: Record<ServiceLevel, { label: string; className: string }> = {
  good: { label: "Good service", className: "badge good" },
  minor: { label: "Minor delays", className: "badge warn" },
  closure: { label: "Part closure", className: "badge bad" },
};

export default async function StatusPage() {
  const statuses = await getLineStatus();
  return (
    <>
      <TopBar title="Line status" />
      <ul className="list status" style={{ marginTop: 4 }}>
        {statuses.map((s) => {
          const info = getLineInfo(s.line);
          const level = LEVELS[s.level];
          return (
            <li key={s.line} className="row">
              <span className="lbar" style={{ background: info.colour }} aria-hidden="true" />
              <span className="meta">
                <b>{info.spoken}</b>
                {s.message && <small>{s.message}</small>}
              </span>
              <span className={level.className}>{level.label}</span>
            </li>
          );
        })}
      </ul>
      <p className="foot">Sample statuses for this prototype.</p>
    </>
  );
}
