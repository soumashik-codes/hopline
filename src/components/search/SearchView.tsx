"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { PlaceItem } from "@/components/search/PlaceItem";
import { usePlaceSearch } from "@/components/search/usePlaceSearch";
import { useToast } from "@/components/Toast";
import { TopBar } from "@/components/TopBar";
import { CURRENT_LOCATION, routesHref } from "@/lib/journey";
import { MIN_QUERY_LENGTH } from "@/lib/places";
import { useRecents, useSaved } from "@/lib/storage";
import type { Place, PlaceSearchSource } from "@/lib/transport/types";

type Field = "from" | "to";
type ListTab = "recent" | "saved";
export type SavedSlot = "home" | "work";

interface ListedPlace {
  place: Place;
  icon: IconName;
  label: string;
}

const LIST_TABS: { id: ListTab; label: string }[] = [
  { id: "recent", label: "Recent" },
  { id: "saved", label: "Home & work" },
];

const SLOT_LABEL: Record<SavedSlot, string> = { home: "Home", work: "Work" };

const FAILED_LABEL: Record<PlaceSearchSource, string> = {
  stations: "stations and stops",
  postcodes: "postcodes",
  addresses: "addresses and places",
};

const RESULTS_ID = "place-results";

function failedMessage(failed: PlaceSearchSource[]): string {
  const names = failed.map((f) => FAILED_LABEL[f]);
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0];
  return `Couldn’t search ${list} just now, so some results may be missing.`;
}

interface SearchViewProps {
  initialFrom: string;
  initialTo: string;
  initialField: Field;
  /** When set, the screen picks the user's Home or Work instead of planning a journey. */
  setting?: SavedSlot;
}

export function SearchView({ initialFrom, initialTo, initialField, setting }: SearchViewProps) {
  const router = useRouter();
  const toast = useToast();
  const [recents, addRecent] = useRecents();
  const [saved, setSaved] = useSaved();
  const { query, status, results, failed, search } = usePlaceSearch();

  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [active, setActive] = useState<Field>(setting ? "to" : initialField);
  const [listTab, setListTab] = useState<ListTab>("recent");
  const [highlighted, setHighlighted] = useState(-1);

  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Focus the active field when the screen opens, as the prototype did.
  useEffect(() => {
    const input = setting || initialField === "to" ? toRef.current : fromRef.current;
    if (!input) return;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, [initialField, setting]);

  // Keep the highlighted result in view when moving through a long list by keyboard.
  useEffect(() => {
    if (highlighted >= 0) document.getElementById(`place-option-${highlighted}`)?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  function runSearch(text: string) {
    setHighlighted(-1);
    search(text);
  }

  function plan(f: string, t: string) {
    if (!t) {
      setActive("to");
      toRef.current?.focus();
      return;
    }
    if (f === t) {
      toast("Start and destination are the same");
      return;
    }
    router.push(routesHref(f, t));
  }

  /** `place` is absent only for "Current location", which has no stored details. */
  function choose(name: string, place?: Place) {
    runSearch("");
    if (setting) {
      if (!place) return;
      setSaved({ ...saved, [setting]: place });
      toast(`${SLOT_LABEL[setting]} saved`);
      router.push("/saved");
      return;
    }
    if (active === "from") {
      setFrom(name);
      if (!to) {
        setActive("to");
        toRef.current?.focus();
        return;
      }
      plan(name, to);
    } else {
      if (place) addRecent(place);
      setTo(name);
      plan(from, name);
    }
  }

  function activate(field: Field, input: HTMLInputElement) {
    if (active === field) return;
    setActive(field);
    runSearch("");
    input.select();
  }

  function swap() {
    // "Current location" can't be a destination, so it is left blank for the user to fill in.
    setFrom(to);
    setTo(from === CURRENT_LOCATION ? "" : from);
    runSearch("");
  }

  const q = query.trim();
  const searching = status === "searching";
  const listed: ListedPlace[] =
    listTab === "recent"
      ? recents.map((place) => ({ place, icon: "clock", label: "Recent" }))
      : (["home", "work"] as const).flatMap((slot): ListedPlace[] => {
          const place = saved[slot];
          return place ? [{ place, icon: slot, label: SLOT_LABEL[slot] }] : [];
        });
  const hasResults = q.length >= MIN_QUERY_LENGTH && results.length > 0;

  function onInputKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!hasResults) return;
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setHighlighted((highlighted + step + results.length) % results.length);
    } else if (e.key === "Escape") {
      if (!q) return;
      e.preventDefault();
      runSearch("");
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (q) {
        if (searching) return;
        const place = results[highlighted >= 0 ? highlighted : 0];
        if (place) choose(place.name, place);
      } else if (active === "from" && !setting) {
        choose(CURRENT_LOCATION);
      } else if (listed[0]) {
        choose(listed[0].place.name, listed[0].place);
      }
    }
  }

  function onTabKey(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = -1;
    if (e.key === "ArrowRight") next = (index + 1) % LIST_TABS.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + LIST_TABS.length) % LIST_TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = LIST_TABS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    setListTab(LIST_TABS[next].id);
    tabRefs.current[next]?.focus();
  }

  // One message per state. It is shown on screen and read out by the live region below.
  let message = "";
  if (status === "short") message = `Type at least ${MIN_QUERY_LENGTH} characters to search.`;
  else if (status === "searching" && !hasResults) message = "Searching…";
  else if (status === "error") message = "Search isn’t working right now. Please try again in a moment.";
  else if (status === "limited") message = "You’re searching very quickly. Wait a few seconds, then try again.";
  else if (status === "done" && !results.length) message = `No places match “${q}”. Try a station name or postcode.`;
  const note = status === "done" && failed.length ? failedMessage(failed) : "";

  let announcement = "";
  if (status === "done") {
    const count = results.length ? `${results.length} ${results.length === 1 ? "place" : "places"} found` : message;
    announcement = note ? `${count}. ${note}` : count;
  } else if (status === "error" || status === "limited") {
    announcement = message;
  }

  function inputProps(field: Field) {
    const isActive = active === field;
    return {
      role: "combobox" as const,
      "aria-autocomplete": "list" as const,
      "aria-expanded": isActive && hasResults,
      "aria-controls": isActive && hasResults ? RESULTS_ID : undefined,
      "aria-activedescendant": isActive && hasResults && highlighted >= 0 ? `place-option-${highlighted}` : undefined,
      autoComplete: "off",
      "data-active": isActive,
    };
  }

  const fieldsLabel = setting ? `Set ${SLOT_LABEL[setting].toLowerCase()}` : "Journey";

  const savedRows = (["home", "work"] as const).map((slot) => {
    const place = saved[slot];
    if (place) return null;
    return (
      <li key={slot}>
        <Link className="row" href={`/search?set=${slot}`}>
          <span className="ico">
            <Icon name={slot} />
          </span>
          <span className="meta">
            <b>Set {SLOT_LABEL[slot].toLowerCase()}</b>
            <small>Search for a station, postcode or address</small>
          </span>
        </Link>
      </li>
    );
  });

  return (
    <>
      <TopBar title={setting ? `Set ${SLOT_LABEL[setting].toLowerCase()}` : "Plan a journey"} backHref={setting ? "/saved" : "/"} />
      <form className="fields" role="search" aria-label={fieldsLabel} onSubmit={(e) => e.preventDefault()}>
        <div className="stack">
          {!setting && (
            <label className="field">
              <span className="dot" aria-hidden="true" />
              <span className="visually-hidden">Start</span>
              <input
                ref={fromRef}
                placeholder="Start"
                value={from}
                {...inputProps("from")}
                onKeyDown={onInputKey}
                onFocus={(e) => activate("from", e.currentTarget)}
                onChange={(e) => {
                  setFrom(e.target.value);
                  runSearch(e.target.value);
                }}
              />
            </label>
          )}
          <label className="field">
            <span className="dot end" aria-hidden="true" />
            <span className="visually-hidden">{setting ? SLOT_LABEL[setting] : "Destination"}</span>
            <input
              ref={toRef}
              placeholder={setting ? "Station, postcode or address" : "Destination"}
              value={to}
              {...inputProps("to")}
              onKeyDown={onInputKey}
              onFocus={(e) => activate("to", e.currentTarget)}
              onChange={(e) => {
                setTo(e.target.value);
                runSearch(e.target.value);
              }}
            />
          </label>
        </div>
        {!setting && (
          <button type="button" className="iconbtn alt" aria-label="Swap start and destination" onClick={swap}>
            <Icon name="swap" />
          </button>
        )}
      </form>

      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      {q ? (
        <>
          {hasResults && (
            <ul className="list" id={RESULTS_ID} role="listbox" aria-label="Search results">
              {results.map((place, i) => (
                <li
                  key={place.id}
                  id={`place-option-${i}`}
                  role="option"
                  aria-selected={i === highlighted}
                  onClick={() => choose(place.name, place)}
                >
                  <div className="row">
                    <PlaceItem place={place} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {(message || note) && (
            <div className="list">
              {message && <p className="empty" style={{ margin: 0 }}>{message}</p>}
              {note && <p className="empty" style={{ margin: 0 }}>{note}</p>}
            </div>
          )}
        </>
      ) : setting ? null : (
        <>
          <div className="tabs" role="tablist" aria-label="Suggestions">
            {LIST_TABS.map((tab, i) => (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={listTab === tab.id}
                aria-controls="suggestions-panel"
                tabIndex={listTab === tab.id ? 0 : -1}
                onClick={() => setListTab(tab.id)}
                onKeyDown={(e) => onTabKey(e, i)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div role="tabpanel" id="suggestions-panel" aria-labelledby={`tab-${listTab}`}>
            <ul className="list">
              {active === "from" && (
                <li>
                  <button type="button" className="row" onClick={() => choose(CURRENT_LOCATION)}>
                    <span className="ico violet">
                      <Icon name="locate" />
                    </span>
                    <span className="meta">
                      <b>Current location</b>
                      <small>Not live yet in this prototype</small>
                    </span>
                  </button>
                </li>
              )}
              {listed.map(({ place, icon, label }) => (
                <li key={`${label}-${place.id}`}>
                  <button type="button" className="row" onClick={() => choose(place.name, place)}>
                    <PlaceItem place={place} icon={icon} label={label} />
                  </button>
                </li>
              ))}
              {listTab === "saved" && savedRows}
              {listTab === "recent" && listed.length === 0 && (
                <li className="empty">Places you plan journeys to appear here.</li>
              )}
            </ul>
          </div>
        </>
      )}

      <p className="credit">
        Place search by{" "}
        <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">
          Geoapify<span className="visually-hidden"> (opens in a new tab)</span>
        </a>
        . ©{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          OpenStreetMap contributors<span className="visually-hidden"> (opens in a new tab)</span>
        </a>
        . Stations and stops: Powered by TfL Open Data.
      </p>
    </>
  );
}
