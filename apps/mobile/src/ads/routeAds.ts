/**
 * One interstitial ad per search, over the wait (TASK-132, TASK-166,
 * ADR-0102). Nothing here may hold the route back: without an ad, consent
 * or network, the route shows as before.
 */

/** What the route screens need from an ad network. */
export type RouteAds = {
  /** A search started with no ad loaded: get one ready for the next. */
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

export function createRouteAds(sdk: AdSdk): RouteAds {
  let started: Promise<boolean> | null = null;
  let ad: Interstitial | null = null;
  let loaded = false;

  const discard = (which: Interstitial) => {
    if (ad === which) {
      ad = null;
      loaded = false;
    }
    which.destroy();
  };

  const prepare = () => {
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
  };

  return {
    prepare,

    // One ad for every route asked for: the user's choice (ADR-0102).
    ready: () => loaded,

    show() {
      const showing = ad;
      if (showing === null || !loaded) {
        return Promise.resolve();
      }
      ad = null;
      loaded = false;
      return new Promise<void>((resolve) => {
        let over = false;
        const end = () => {
          if (!over) {
            over = true;
            showing.destroy();
            resolve();
            // The next ad loads now, to be ready for the next route.
            prepare();
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
