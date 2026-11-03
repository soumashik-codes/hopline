"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { TopBar } from "@/components/TopBar";
import { journeyQuery } from "@/lib/journey";
import { getLineInfo } from "@/lib/transport/lines";
import { stopsLabel } from "@/lib/transport/stops";
import type { Route } from "@/lib/transport/types";

// Walking steps use the light-mode violet in both themes so white text keeps 4.5:1 contrast.
const WALK_COLOUR = "#5B4BDB";

export function GoView({ route }: { route: Route }) {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [passed, setPassed] = useState(0);
  const legs = route.legs;
  const leg = legs[step];
  const last = step === legs.length - 1;

  const line = leg.type === "ride" ? getLineInfo(leg.line) : null;
  const big = leg.type === "walk" ? leg.label : `Ride the ${leg.label} to ${leg.to}`;
  const tip = leg.type === "walk" ? leg.detail : `${leg.detail}${leg.platform ? ` · ${leg.platform}` : ""}. Board at ${leg.from}.`;
  const icon = leg.type === "walk" ? "walk" : leg.line === "Bus" ? "bus" : "tube";
  const headStyle = {
    "--c": line?.colour ?? WALK_COLOUR,
    "--ct": line?.textColour ?? "#FFFFFF",
  } as React.CSSProperties;

  // Stops passed so far in the current ride leg; reset whenever the step changes.
  const stops = leg.type === "ride" ? leg.stops : [];
  const upcoming = stops.slice(passed);
  const nextStop = upcoming[0];
  const stopLine =
    leg.type !== "ride" || stops.length === 0
      ? null
      : nextStop
        ? `Next: ${nextStop}. ${stopsLabel(upcoming.length)} until ${leg.to}`
        : `Next: ${leg.to}. Get off there`;

  function goTo(n: number) {
    setStep(n);
    setPassed(0);
  }

  function next() {
    if (last) {
      toast("You’ve arrived");
      router.push("/");
      return;
    }
    goTo(step + 1);
  }

  return (
    <>
      <TopBar title="On the way" backHref={`/routes/${route.id}?${journeyQuery(route.from, route.to)}`} backLabel="End journey" />
      <section className="gohead" style={headStyle} aria-live="polite" aria-atomic="true">
        <small>
          Step {step + 1} of {legs.length} · about {leg.mins} min
        </small>
        <h2 className="big">{big}</h2>
        <div className="prog" aria-hidden="true">
          <i style={{ width: `${((step + 1) / legs.length) * 100}%` }} />
        </div>
      </section>
      <div className="list" style={{ marginTop: 14 }}>
        <div className="row">
          <span className="ico">
            <Icon name={icon} />
          </span>
          <span className="meta">
            <b>{tip}</b>
            {stopLine && (
              <small className="stopline" aria-live="polite">
                {stopLine}
              </small>
            )}
            <small>{last ? "Last step" : `Then: ${legs[step + 1].label}`}</small>
          </span>
        </div>
      </div>
      {nextStop && (
        <div className="gonav">
          <button type="button" onClick={() => setPassed(passed + 1)}>
            Passed {nextStop}
          </button>
        </div>
      )}
      <div className="gonav">
        <button type="button" disabled={step === 0} onClick={() => goTo(step - 1)}>
          Previous
        </button>
        <button type="button" className="accent" onClick={next}>
          {last ? "I’ve arrived" : "Next step"}
        </button>
      </div>
    </>
  );
}
