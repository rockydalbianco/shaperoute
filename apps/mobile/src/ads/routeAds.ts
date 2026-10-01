/**
 * One interstitial ad between "route ready" and "route shown" (TASK-132,
 * ADR-0102). Nothing here may hold the route back: without an ad, consent
 * or network, the route shows as before.
 */

/** What the route screens need from an ad network. */
export type RouteAds = {
  /** A route was asked for: get an ad ready while the engine works. */
  prepare(): void;
  /** An ad is loaded and may be shown now. */
  ready(): boolean;
  /** Shows the ad; resolves when it is closed or could not be shown. Never rejects. */
  show(): Promise<void>;
};

/** Expo Go, the web, tests: no ad network, the route shows at once. */
export const NO_ADS: RouteAds = {
  prepare() {},
  ready: () => false,
  show: () => Promise.resolve(),
};

/** One full-screen ad, as the SDK gives it (admob.ts). */
export type Interstitial = {
  load(): void;
  show(): Promise<void>;
  onLoaded(listener: () => void): void;
  onClosed(listener: () => void): void;
  onError(listener: () => void): void;
  destroy(): void;
};

/** The ad network: tests stand in for it. */
export type AdSdk = {
  /** Asks for consent where the law wants it, then starts the SDK.
   * True when ads may be requested. */
  start(): Promise<boolean>;
  interstitial(): Interstitial;
};

/** At most one ad in this time, however many routes are asked for. */
export const MIN_GAP_MS = 3 * 60 * 1000;

export function createRouteAds(sdk: AdSdk, now: () => number = Date.now): RouteAds {
  let started: Promise<boolean> | null = null;
  let ad: Interstitial | null = null;
  let loaded = false;
  let lastShown = -Infinity;

  const discard = (which: Interstitial) => {
    if (ad === which) {
      ad = null;
      loaded = false;
    }
    which.destroy();
  };

  return {
    prepare() {
      if (ad !== null) {
        return;
      }
      // Consent asked once; asked again only after an error (no network).
      started ??= sdk.start().catch(() => {
        started = null;
        return false;
      });
      void started.then((allowed) => {
        if (!allowed || ad !== null) {
          return;
        }
        const next = sdk.interstitial();
        ad = next;
        next.onLoaded(() => {
          if (ad === next) {
            loaded = true;
          }
        });
        next.onError(() => discard(next));
        next.load();
      });
    },

    ready: () => loaded && now() - lastShown >= MIN_GAP_MS,

    show() {
      const showing = ad;
      if (showing === null || !loaded) {
        return Promise.resolve();
      }
      ad = null;
      loaded = false;
      lastShown = now();
      return new Promise<void>((resolve) => {
        let over = false;
        const end = () => {
          if (!over) {
            over = true;
            showing.destroy();
            resolve();
          }
        };
        showing.onClosed(end);
        showing.onError(end);
        try {
          showing.show().catch(end);
        } catch {
          end();
        }
      });
    },
  };
}
