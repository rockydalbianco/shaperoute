import type { Activity, LatLon } from "@shaperoute/shared-types";
import { useCallback, useEffect, useRef, useState } from "react";

import { apiKey, keyHeaders } from "../api/apiUrl";
import { nearParams } from "../places/photon";
import {
  activityParam,
  isRecommendedList,
  measuredFrom,
  type RecommendedRoute,
} from "./recommendedRoutes";

/**
 * The whole catalog of the server for «Explore» (TASK-420, the user's choice
 * of 2026-11-10: every drawing in the page, nearest first): GET /catalog,
 * a page at a time, with the routes as GET /recommended-routes lists them.
 * The API orders them city by city from the nearest, and by likeness inside
 * a city; the page shows them as they come.
 */

/** How many routes a page asks for: a screenful and the next. */
export const CATALOG_PAGE = 40;

export type CatalogPage = {
  /** How many routes the catalog has in all. */
  total: number;
  /** How many cities, when the API says. */
  cities?: number;
  routes: RecommendedRoute[];
};

export type PageOutcome =
  | { kind: "page"; page: CatalogPage }
  /** The API has no catalog (an API older than this): the page does without. */
  | { kind: "none" }
  | { kind: "failed" };

type Options = {
  fetchFn?: typeof fetch;
  key?: string | null;
  signal?: AbortSignal;
  limit?: number;
  /** Whose drawings (TASK-441): a run's when left out. */
  activity?: Activity;
};

export function catalogUrl(
  baseUrl: string,
  near: LatLon,
  offset: number,
  limit: number = CATALOG_PAGE,
  activity: Activity = "running",
): string {
  return (
    `${baseUrl}/catalog?${nearParams(near)}&offset=${offset}&limit=${limit}` +
    activityParam(activity)
  );
}

function isCatalogPage(body: unknown): body is CatalogPage {
  if (!isRecommendedList(body)) {
    return false;
  }
  const page = body as Record<string, unknown>;
  return (
    typeof page.total === "number" &&
    Number.isInteger(page.total) &&
    page.total >= 0 &&
    (page.cities === undefined || typeof page.cities === "number")
  );
}

/** One page of the catalog from `offset`. Never throws. */
export async function fetchCatalogPage(
  baseUrl: string,
  near: LatLon,
  offset: number,
  {
    fetchFn = fetch,
    key = apiKey(),
    signal,
    limit = CATALOG_PAGE,
    activity,
  }: Options = {},
): Promise<PageOutcome> {
  try {
    const response = await fetchFn(catalogUrl(baseUrl, near, offset, limit, activity), {
      headers: keyHeaders(key),
      signal,
    });
    if (response.status === 404) {
      return { kind: "none" };
    }
    const body: unknown = await response.json();
    if (!response.ok) {
      return { kind: "failed" };
    }
    // An answer that is not a page of the catalog: an API that does not
    // give one, as one without the path. The page does without.
    return isCatalogPage(body)
      ? { kind: "page", page: { ...body, routes: measuredFrom(near, body.routes) } }
      : { kind: "none" };
  } catch {
    return { kind: "failed" };
  }
}

/** The routes of one city, in the order the catalog gives them. */
export type CityGroup = {
  city: string;
  /** From the point asked about to the nearest start of the city. */
  away_m: number;
  routes: RecommendedRoute[];
};

/** The routes by city, each city where its first route is, with its
 * nearest start; `left` are left out (the ones «Near you» already shows). */
export function groupByCity(
  routes: readonly RecommendedRoute[],
  left: ReadonlySet<string> = new Set(),
): CityGroup[] {
  const groups: CityGroup[] = [];
  const byCity = new Map<string, CityGroup>();
  for (const route of routes) {
    if (left.has(route.id)) {
      continue;
    }
    let group = byCity.get(route.city);
    if (group === undefined) {
      group = { city: route.city, away_m: route.away_m, routes: [] };
      byCity.set(route.city, group);
      groups.push(group);
    }
    group.routes.push(route);
    group.away_m = Math.min(group.away_m, route.away_m);
  }
  return groups;
}

/** A row of the list: a city's label, or up to two cards side by side. */
export type FarRow =
  | { kind: "city"; key: string; city: string; away_m: number; count: number }
  | { kind: "pair"; key: string; routes: RecommendedRoute[] };

/** The rows of the groups: each city's label, then its routes two by two. */
export function farRows(groups: readonly CityGroup[]): FarRow[] {
  const rows: FarRow[] = [];
  for (const group of groups) {
    rows.push({
      kind: "city",
      key: `city:${group.city}`,
      city: group.city,
      away_m: group.away_m,
      count: group.routes.length,
    });
    for (let i = 0; i < group.routes.length; i += 2) {
      const routes = group.routes.slice(i, i + 2);
      rows.push({ kind: "pair", key: `pair:${routes[0].id}`, routes });
    }
  }
  return rows;
}

export type CatalogState = {
  /** "off" without an API or a start; "none" when the API has no catalog;
   * "loading" while a page is on its way; "ready" between pages; "failed"
   * when the last page did not come (`loadMore` tries again). */
  status: "off" | "none" | "loading" | "ready" | "failed";
  routes: RecommendedRoute[];
  /** How many the catalog has in all; null until the first page. */
  total: number | null;
  cities: number | null;
  /** True while there are routes the page has not asked for yet. */
  more: boolean;
  /** Asks for the next page, or again for the one that failed. */
  loadMore: () => void;
};

const NO_ROUTES: RecommendedRoute[] = [];

/**
 * The catalog near `near`, a page at a time: the first page as soon as there
 * is a start, the next on `loadMore`. Another start begins again from its
 * first page; pages of a start left behind are dropped.
 */
export function useCatalog(
  apiUrl: string | null,
  near: LatLon | null,
  { fetchFn, key, limit = CATALOG_PAGE, activity }: Omit<Options, "signal"> = {},
): CatalogState {
  const lat = near?.[0];
  const lon = near?.[1];
  const place =
    apiUrl === null || lat === undefined || lon === undefined
      ? null
      : `${apiUrl} ${nearParams([lat, lon])}${activityParam(activity)}`;
  const [state, setState] = useState<{
    place: string | null;
    status: CatalogState["status"];
    routes: RecommendedRoute[];
    total: number | null;
    cities: number | null;
  }>({ place: null, status: "off", routes: NO_ROUTES, total: null, cities: null });
  // The request on its way, if any: one at a time, for the place shown.
  const asking = useRef<AbortController | null>(null);

  const ask = useCallback(
    (offset: number) => {
      if (place === null || apiUrl === null || lat === undefined || lon === undefined) {
        return;
      }
      asking.current?.abort();
      const controller = new AbortController();
      asking.current = controller;
      void fetchCatalogPage(apiUrl, [lat, lon], offset, {
        fetchFn,
        key,
        limit,
        activity,
        signal: controller.signal,
      }).then((outcome) => {
        if (controller.signal.aborted) {
          return;
        }
        setState((was) => {
          // The first page of a place starts from nothing.
          const base =
            was.place === place
              ? was
              : {
                  place,
                  status: "loading" as const,
                  routes: NO_ROUTES,
                  total: null,
                  cities: null,
                };
          if (outcome.kind === "none") {
            return { ...base, status: "none" };
          }
          if (outcome.kind === "failed") {
            return { ...base, status: "failed" };
          }
          const { page } = outcome;
          // A page already there is not added twice.
          const known = new Set(base.routes.map((r) => r.id));
          return {
            ...base,
            status: "ready",
            routes: [...base.routes, ...page.routes.filter((r) => !known.has(r.id))],
            total: page.total,
            cities: page.cities ?? base.cities,
          };
        });
      });
    },
    [activity, apiUrl, fetchFn, key, lat, limit, lon, place],
  );

  // A new place: its first page, "loading" until it comes (`shown` is null
  // for it). Without a place nothing is asked.
  useEffect(() => {
    if (place === null) {
      asking.current?.abort();
      return;
    }
    ask(0);
    return () => asking.current?.abort();
  }, [place, ask]);

  const shown = state.place === place ? state : null;
  const routes = shown?.routes ?? NO_ROUTES;
  const total = shown?.total ?? null;
  const status = place === null ? "off" : (shown?.status ?? "loading");
  const more = total !== null && routes.length < total;
  const loadMore = useCallback(() => {
    if (status === "loading" || status === "none" || status === "off") {
      return;
    }
    if (status === "failed" || more) {
      setState((was) => (was.place === place ? { ...was, status: "loading" } : was));
      ask(routes.length);
    }
  }, [ask, more, place, routes.length, status]);

  return { status, routes, total, cities: shown?.cities ?? null, more, loadMore };
}
