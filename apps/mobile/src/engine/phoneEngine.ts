import { type PageMessage, type PageZone, pageCall } from "./page";

/**
 * The engine on the phone, as the rest of the app sees it (TASK-214,
 * ADR-0177): `plan` gives the JSON of GET /route-jobs/{job_id} for the JSON
 * of POST /route-jobs, computed in the hidden WebView (PhoneEngineView), or
 * says why it could not. It never throws: whoever asks goes to the server
 * on any failure, and the person using the app sees no error from here.
 *
 * The WebView is mounted the first time it is wanted (`warmUp` or `plan`),
 * and again after iOS closes it for memory. Requests run one at a time: the
 * page holds one zone set and one Python.
 */

export type PlanAnswer =
  | { kind: "done"; json: string; ms: number; memoryMb: number }
  | { kind: "failed"; why: string };

/** The page, once loaded: what it is told goes through here. */
export type PageLink = {
  send: (javascript: string) => void;
  pyodide: string;
  engine: string;
};

/** Loading Python and the engine: about 5 s on the Mac, slower on a phone. */
export const BOOT_TIMEOUT_MS = 90_000;
/** A 21 km route takes about 50 s on the server; the phone gets twice that,
 * unless the caller says otherwise (a route with no server to ask). */
export const PLAN_TIMEOUT_MS = 120_000;
/** After this many deaths of the WebView, the phone stops trying until the
 * app opens again: the server draws every route. */
export const MAX_DEATHS = 2;

type Job = {
  id: number;
  body: string;
  zones: PageZone[];
  timeoutMs: number;
  resolve: (answer: PlanAnswer) => void;
};

type State = "off" | "starting" | "ready" | "broken";

export class PhoneEngine {
  private state: State = "off";
  private link: PageLink | null = null;
  private queue: Job[] = [];
  private running: { job: Job; timer: ReturnType<typeof setTimeout> } | null = null;
  private bootTimer: ReturnType<typeof setTimeout> | null = null;
  private nextId = 1;
  private deaths = 0;
  private generation = 0;
  private readonly listeners = new Set<() => void>();
  /** Times and memory of the last route, for the iPhone check (part D). */
  last: { bootMs?: number; planMs?: number; memoryMb?: number } = {};

  /** The key of the WebView to mount, -1 for none: a new key mounts a new
   * one, after a death or a timeout. */
  get mountKey(): number {
    return this.state === "starting" || this.state === "ready" ? this.generation : -1;
  }

  get available(): boolean {
    return this.state !== "broken";
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Starts Python ahead of the first route, when zones are saved. */
  warmUp(): void {
    if (this.state === "off") {
      this.start();
    }
  }

  plan(
    body: string,
    zones: PageZone[],
    timeoutMs: number = PLAN_TIMEOUT_MS,
  ): Promise<PlanAnswer> {
    if (this.state === "broken") {
      return Promise.resolve({ kind: "failed", why: "the engine does not start" });
    }
    return new Promise((resolve) => {
      this.queue.push({ id: this.nextId++, body, zones, timeoutMs, resolve });
      if (this.state === "off") {
        this.start();
      } else {
        this.next();
      }
    });
  }

  /** The page has loaded: Python starts. */
  attach(link: PageLink): void {
    if (this.state !== "starting") {
      return;
    }
    this.link = link;
    link.send(pageCall("boot", { pyodide: link.pyodide, engine: link.engine }));
  }

  /** The files for the page could not be prepared. */
  unavailable(why: string): void {
    this.breakDown(why);
  }

  receive(data: string): void {
    let message: PageMessage;
    try {
      message = JSON.parse(data) as PageMessage;
    } catch {
      return;
    }
    if (message.type === "ready") {
      this.clearBoot();
      this.state = "ready";
      this.last = { bootMs: message.ms };
      this.next();
    } else if (message.type === "failed") {
      this.breakDown(message.error);
    } else if (this.running !== null && message.id === this.running.job.id) {
      const { job, timer } = this.running;
      clearTimeout(timer);
      this.running = null;
      if (message.type === "result") {
        this.last = { ...this.last, planMs: message.ms, memoryMb: message.memoryMb };
        job.resolve({
          kind: "done",
          json: message.json,
          ms: message.ms,
          memoryMb: message.memoryMb,
        });
      } else {
        job.resolve({ kind: "failed", why: message.error });
        if (message.fatal) {
          this.reload();
          return;
        }
      }
      this.next();
    }
  }

  /** iOS closed the WebView's process, most likely for memory. Only a death
   * during a route counts: an idle WebView is fair game for iOS. */
  died(): void {
    if (this.running !== null) {
      this.deaths += 1;
    }
    this.restart("the engine was closed");
  }

  private start(): void {
    this.state = "starting";
    this.generation += 1;
    this.bootTimer = setTimeout(
      () => this.restart("the engine did not start in time"),
      BOOT_TIMEOUT_MS,
    );
    this.changed();
  }

  private next(): void {
    if (this.state !== "ready" || this.running !== null || this.link === null) {
      return;
    }
    const job = this.queue.shift();
    if (job === undefined) {
      return;
    }
    const timer = setTimeout(() => {
      this.restart("the route took too long on the phone");
    }, job.timeoutMs);
    this.running = { job, timer };
    this.link.send(pageCall("plan", { id: job.id, body: job.body, zones: job.zones }));
  }

  /** Drops the WebView; the next request mounts a new one, unless it died
   * too often. Whoever was waiting goes to the server. */
  private restart(why: string): void {
    this.failAll(why);
    this.clearBoot();
    this.link = null;
    if (this.deaths >= MAX_DEATHS) {
      this.state = "broken";
    } else {
      this.state = "off";
      this.generation += 1;
    }
    this.changed();
  }

  /** A new page for Python that can no longer run; the requests waiting
   * stay, for the new one. */
  private reload(): void {
    this.clearBoot();
    this.link = null;
    this.state = "off";
    this.generation += 1;
    if (this.queue.length > 0) {
      this.start();
    } else {
      this.changed();
    }
  }

  private breakDown(why: string): void {
    this.failAll(why);
    this.clearBoot();
    this.link = null;
    this.state = "broken";
    this.changed();
  }

  private failAll(why: string): void {
    if (this.running !== null) {
      clearTimeout(this.running.timer);
      this.running.job.resolve({ kind: "failed", why });
      this.running = null;
    }
    for (const job of this.queue.splice(0)) {
      job.resolve({ kind: "failed", why });
    }
  }

  private clearBoot(): void {
    if (this.bootTimer !== null) {
      clearTimeout(this.bootTimer);
      this.bootTimer = null;
    }
  }

  private changed(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

/** The one engine of the app. */
export const phoneEngine = new PhoneEngine();
