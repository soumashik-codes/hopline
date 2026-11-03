"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { TopBar } from "@/components/TopBar";
import { CURRENT_LOCATION, routesHref } from "@/lib/journey";
import { useRecents, useSaved } from "@/lib/storage";
import type { Place } from "@/lib/transport/types";

type Field = "from" | "to";
type ListTab = "recent" | "saved";

interface Item {
  name: string;
  description: string;
  icon: IconName;
}

const LIST_TABS: { id: ListTab; label: string }[] = [
  { id: "recent", label: "Recent" },
  { id: "saved", label: "Home & work" },
];

export function SearchView({ initialFrom, initialTo, initialField }: { initialFrom: string; initialTo: string; initialField: Field }) {
  const router = useRouter();
  const toast = useToast();
  const [recents] = useRecents();
  const [saved] = useSaved();

  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [active, setActive] = useState<Field>(initialField);
  const [query, setQuery] = useState("");
  const [listTab, setListTab] = useState<ListTab>("recent");
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);

  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pending = useRef<{ timer?: number; controller?: AbortController }>({});

  // Focus the active field when the screen opens, as the prototype did.
  useEffect(() => {
    const input = initialField === "from" ? fromRef.current : toRef.current;
    if (!input) return;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, [initialField]);

  useEffect(() => () => pending.current.controller?.abort(), []);

  function search(text: string) {
    setQuery(text);
    window.clearTimeout(pending.current.timer);
    pending.current.controller?.abort();
    if (!text.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    pending.current.timer = window.setTimeout(async () => {
      const controller = new AbortController();
      pending.current.controller = controller;
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(text)}`, { signal: controller.signal });
        const data: { places: Place[] } = await res.json();
        setResults(data.places);
        setSearching(false);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setResults([]);
          setSearching(false);
        }
      }
    }, 150);
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

  function pick(name: string) {
    search("");
    if (active === "from") {
      setFrom(name);
      if (!to) {
        setActive("to");
        toRef.current?.focus();
        return;
      }
      plan(name, to);
    } else {
      setTo(name);
      plan(from, name);
    }
  }

  function activate(field: Field, input: HTMLInputElement) {
    if (active === field) return;
    setActive(field);
    search("");
    input.select();
  }

  function swap() {
    if (to || from) {
      const nextFrom = to || "";
      const nextTo = from === CURRENT_LOCATION ? "Preston Road" : from;
      setFrom(nextFrom);
      setTo(nextTo);
    }
    search("");
  }

  const q = query.trim();
  let items: Item[];
  if (q) items = results.map((p) => ({ name: p.name, description: p.description, icon: p.kind }));
  else if (listTab === "recent") items = recents.map((name) => ({ name, description: "Recent", icon: "clock" }));
  else
    items = [
      { name: saved.home, description: "Home", icon: "home" },
      { name: saved.work, description: "Work", icon: "work" },
    ];

  function onInputKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (q && searching) return;
    const first = active === "from" && !q ? CURRENT_LOCATION : items[0]?.name;
    if (first) pick(first);
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

  let announcement = "";
  if (q && !searching) {
    announcement = results.length
      ? `${results.length} ${results.length === 1 ? "place" : "places"} found`
      : `No places match ${q}`;
  }

  const rows = (
    <>
      {active === "from" && !q && (
        <li>
          <button type="button" className="row" onClick={() => pick(CURRENT_LOCATION)}>
            <span className="ico violet">
              <Icon name="locate" />
            </span>
            <span className="meta">
              <b>Current location</b>
              <small>Near Preston Road</small>
            </span>
          </button>
        </li>
      )}
      {items.map((item) => (
        <li key={`${item.description}-${item.name}`}>
          <button type="button" className="row" onClick={() => pick(item.name)}>
            <span className="ico">
              <Icon name={item.icon} />
            </span>
            <span className="meta">
              <b>{item.name}</b>
              <small>{item.description}</small>
            </span>
          </button>
        </li>
      ))}
      {q && !searching && items.length === 0 && (
        <li className="empty">No places match “{query}”. Try a station name or postcode.</li>
      )}
      {q && searching && items.length === 0 && <li className="empty">Searching…</li>}
    </>
  );

  return (
    <>
      <TopBar title="Plan a journey" backHref="/" />
      <form className="fields" role="search" aria-label="Journey" onSubmit={(e) => e.preventDefault()}>
        <div className="stack">
          <label className="field">
            <span className="dot" aria-hidden="true" />
            <span className="visually-hidden">Start</span>
            <input
              ref={fromRef}
              placeholder="Start"
              value={from}
              data-active={active === "from"}
              autoComplete="off"
              onFocus={(e) => activate("from", e.currentTarget)}
              onChange={(e) => {
                setFrom(e.target.value);
                search(e.target.value);
              }}
              onKeyDown={onInputKey}
            />
          </label>
          <label className="field">
            <span className="dot end" aria-hidden="true" />
            <span className="visually-hidden">Destination</span>
            <input
              ref={toRef}
              placeholder="Destination"
              value={to}
              data-active={active === "to"}
              autoComplete="off"
              onFocus={(e) => activate("to", e.currentTarget)}
              onChange={(e) => {
                setTo(e.target.value);
                search(e.target.value);
              }}
              onKeyDown={onInputKey}
            />
          </label>
        </div>
        <button type="button" className="iconbtn alt" aria-label="Swap start and destination" onClick={swap}>
          <Icon name="swap" />
        </button>
      </form>

      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      {q ? (
        <ul className="list" aria-label="Search results">
          {rows}
        </ul>
      ) : (
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
            <ul className="list">{rows}</ul>
          </div>
        </>
      )}
    </>
  );
}
