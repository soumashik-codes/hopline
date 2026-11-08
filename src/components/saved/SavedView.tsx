"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { PlaceItem } from "@/components/search/PlaceItem";
import { TopBar } from "@/components/TopBar";
import { CURRENT_ENDPOINT, endpointOf, routesHref } from "@/lib/journey";
import { useSaved } from "@/lib/storage";

const SLOTS = [
  { slot: "home", label: "Home" },
  { slot: "work", label: "Work" },
] as const;

export function SavedView() {
  const [saved] = useSaved();
  return (
    <>
      <TopBar title="Saved" />
      <h2 className="visually-hidden">Places</h2>
      <ul className="list" style={{ marginTop: 4 }}>
        {SLOTS.map(({ slot, label }) => {
          const place = saved[slot];
          return (
            <li key={slot} className="slot">
              {place ? (
                <>
                  <Link className="row" href={routesHref(CURRENT_ENDPOINT, endpointOf(place))}>
                    <PlaceItem place={place} icon={slot} label={label} />
                  </Link>
                  <Link className="slot-change" href={`/search?set=${slot}`}>
                    Change<span className="visually-hidden"> {label.toLowerCase()}</span>
                  </Link>
                </>
              ) : (
                <Link className="row" href={`/search?set=${slot}`}>
                  <span className="ico">
                    <Icon name={slot} />
                  </span>
                  <span className="meta">
                    <b>Set {label.toLowerCase()}</b>
                    <small>Search for a station, postcode or address</small>
                  </span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      <h2 style={{ margin: "4px 18px 0" }}>Saved trips</h2>
      {saved.routes.length ? (
        <ul className="list">
          {saved.routes.map((trip) => (
            <li key={`${trip.from.name}|${trip.from.lat}|${trip.to.name}|${trip.to.lat}|${trip.to.lon}`}>
              <Link className="row" href={routesHref(trip.from, trip.to)}>
                <span className="ico">
                  <Icon name="star" />
                </span>
                <span className="meta">
                  <b>{trip.to.name}</b>
                  <small>from {trip.from.name}</small>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="list">
          <p className="empty" style={{ margin: 0 }}>
            Trips you save from the routes screen appear here, one tap away.
          </p>
        </div>
      )}
    </>
  );
}
