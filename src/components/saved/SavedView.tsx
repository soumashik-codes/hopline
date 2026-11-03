"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { TopBar } from "@/components/TopBar";
import { CURRENT_LOCATION, routesHref } from "@/lib/journey";
import { useSaved } from "@/lib/storage";

export function SavedView() {
  const [saved] = useSaved();
  return (
    <>
      <TopBar title="Saved" />
      <h2 className="visually-hidden">Places</h2>
      <ul className="list" style={{ marginTop: 4 }}>
        <li>
          <Link className="row" href={routesHref(CURRENT_LOCATION, saved.home)}>
            <span className="ico">
              <Icon name="home" />
            </span>
            <span className="meta">
              <b>Home</b>
              <small>{saved.home}</small>
            </span>
          </Link>
        </li>
        <li>
          <Link className="row" href={routesHref(CURRENT_LOCATION, saved.work)}>
            <span className="ico">
              <Icon name="work" />
            </span>
            <span className="meta">
              <b>Work</b>
              <small>{saved.work}</small>
            </span>
          </Link>
        </li>
      </ul>
      <h2 style={{ margin: "4px 18px 0" }}>Saved trips</h2>
      {saved.routes.length ? (
        <ul className="list">
          {saved.routes.map((trip) => (
            <li key={`${trip.from}|${trip.to}`}>
              <Link className="row" href={routesHref(trip.from, trip.to)}>
                <span className="ico">
                  <Icon name="star" />
                </span>
                <span className="meta">
                  <b>{trip.to}</b>
                  <small>from {trip.from}</small>
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
