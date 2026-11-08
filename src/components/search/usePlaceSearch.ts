"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MIN_QUERY_LENGTH } from "@/lib/places";
import type { Place, PlaceSearchResult, PlaceSearchSource } from "@/lib/transport/types";

/** Wait for a pause in typing before searching, so one search costs one request, not one per key. */
const PAUSE_MS = 350;

export type SearchStatus =
  | "idle" // nothing typed
  | "short" // typed, but too little to search yet
  | "searching"
  | "done"
  | "error" // the search could not run at all
  | "limited"; // searching too fast

export interface PlaceSearch {
  /** What the user has typed, not trimmed. */
  query: string;
  status: SearchStatus;
  results: Place[];
  /** Services that failed on the last search. `results` came from the others. */
  failed: PlaceSearchSource[];
  search: (text: string) => void;
}

export function usePlaceSearch(): PlaceSearch {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [results, setResults] = useState<Place[]>([]);
  const [failed, setFailed] = useState<PlaceSearchSource[]>([]);
  const pending = useRef<{ timer?: number; controller?: AbortController }>({});

  const cancel = useCallback(() => {
    window.clearTimeout(pending.current.timer);
    pending.current.controller?.abort();
  }, []);

  useEffect(() => cancel, [cancel]);

  const search = useCallback(
    (text: string) => {
      cancel();
      setQuery(text);
      const q = text.trim();
      if (q.length < MIN_QUERY_LENGTH) {
        setResults([]);
        setFailed([]);
        return setStatus(q ? "short" : "idle");
      }

      // Earlier results stay on screen until the new ones arrive, so the list doesn't flicker as people type.
      setStatus("searching");
      pending.current.timer = window.setTimeout(async () => {
        const controller = new AbortController();
        pending.current.controller = controller;
        try {
          const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`, { signal: controller.signal });
          if (res.status === 429) return setStatus("limited");
          if (!res.ok) return setStatus("error");
          const data: PlaceSearchResult = await res.json();
          setResults(data.places);
          setFailed(data.failed);
          // Two or more services failed and nothing came back: that is an error, not "no matches".
          setStatus(data.places.length === 0 && data.failed.length >= 2 ? "error" : "done");
        } catch (err) {
          if ((err as Error).name !== "AbortError") setStatus("error");
        }
      }, PAUSE_MS);
    },
    [cancel],
  );

  return { query, status, results, failed, search };
}
