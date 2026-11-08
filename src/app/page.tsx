import Link from "next/link";
import { Greeting, MapButtons, ModeChips, QuickPlaces } from "@/components/home/HomeControls";
import { Icon } from "@/components/Icon";
import { LinePill } from "@/components/LinePill";
import { getNearbyDepartures } from "@/lib/transport";

export default async function HomePage() {
  const departures = await getNearbyDepartures();
  return (
    <>
      <div className="mapwrap">
        <svg className="map" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
          <rect width="400" height="300" fill="var(--map1)" />
          <path d="M-10 230 C80 200 140 260 230 220 S360 180 420 210 L420 300 L-10 300Z" fill="var(--park)" />
          <path d="M260 -10 C250 60 300 90 290 160" stroke="var(--water)" strokeWidth="14" fill="none" />
          <g stroke="var(--map2)" strokeWidth="10" fill="none" strokeLinecap="round">
            <path d="M-10 70 L420 110" />
            <path d="M60 -10 L150 310" />
            <path d="M-10 170 L420 140" />
            <path d="M330 -10 L250 310" />
          </g>
          <g stroke="var(--surface)" strokeWidth="3" fill="none" opacity=".7">
            <path d="M-10 40 L180 60 L220 0" />
            <path d="M110 120 L210 150 L200 300" />
            <path d="M340 230 L420 260" />
          </g>
          <path d="M-10 200 C90 180 150 150 208 144 S330 80 420 40" stroke="#9B0056" strokeWidth="5" fill="none" />
          <circle cx="208" cy="144" r="7" fill="var(--surface)" stroke="#9B0056" strokeWidth="4" />
        </svg>
        <div className="youare" role="img" aria-label="Sample map. This is not your location" />
        <MapButtons />
      </div>
      <section className="sheet">
        <Greeting />
        <Link className="searchbar" href="/search?field=to">
          <Icon name="search" />
          Search a place or postcode
        </Link>
        <QuickPlaces />
        <ModeChips />
        <h2 id="nearby-heading">Leaving nearby</h2>
        <p className="empty" style={{ padding: "0 0 8px" }}>
          Sample departures for this prototype. They are not live.
        </p>
        <ul className="plain" aria-labelledby="nearby-heading">
          {departures.map((d, i) => (
            <li className="dep" key={i}>
              <LinePill line={d.line} busNumber={d.busNumber} />
              <div className="meta">
                <b>{d.direction}</b>
                <br />
                <small>
                  {d.stop} · then {d.mins[1]} min
                </small>
              </div>
              <div className="mins">
                {d.mins[0]}
                <small>min</small>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
