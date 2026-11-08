import { getLineInfo } from "@/lib/transport/lines";
import type { Leg } from "@/lib/transport/types";
import { Icon } from "./Icon";
import { LinePill } from "./LinePill";

/** Proportional coloured bar. Purely visual; LegsList carries the same information as text. */
export function RouteStrip({ legs }: { legs: Leg[] }) {
  return (
    <div className="strip" aria-hidden="true">
      {legs.map((leg, i) => (
        <span
          key={i}
          className={leg.type === "walk" ? "walk" : undefined}
          style={{ flex: Math.max(leg.mins, 1), background: leg.type === "ride" ? getLineInfo(leg.line).colour : undefined }}
        />
      ))}
    </div>
  );
}

/** Compact text summary of the legs: walk minutes and line pills. */
export function LegsList({ legs }: { legs: Leg[] }) {
  return (
    <ol className="legs" aria-label="Journey legs">
      {legs.map((leg, i) => (
        <li key={i}>
          {i > 0 && (
            <span className="sep" aria-hidden="true">
              ›
            </span>
          )}
          {leg.type === "walk" ? (
            <>
              <Icon name={leg.travel === "cycling" ? "bike" : "walk"} small />
              <span>
                {leg.mins === 0 ? "<1" : leg.mins}
                <span className="visually-hidden"> {leg.mins === 0 ? "(less than a minute) " : ""}min {leg.travel === "cycling" ? "cycle" : "walk"}</span>
              </span>
            </>
          ) : (
            <LinePill line={leg.line} busNumber={leg.busNumber} />
          )}
        </li>
      ))}
    </ol>
  );
}
