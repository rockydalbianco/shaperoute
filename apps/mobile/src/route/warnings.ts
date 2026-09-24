/**
 * The route engine's warnings in plain words (TASK-054).
 *
 * The engine writes them for developers: "shape similarity 0.85 is below 0.90
 * after 12 attempts". The contract has no codes for them yet, so the app
 * recognises the texts the engine writes today and says them simply. A text it
 * does not recognise is shown as it is: a new warning is never hidden.
 *
 * The patterns follow the engine's f-strings: `validation.py` (the Issues),
 * `optimizer.py` (search, plan_shape) and `network.py` (snap_to_network).
 * Codes in the contract would make this file unnecessary.
 */

/** How a note should look: something to watch for, or just to know. */
export type NoteTone = "caution" | "info";

export type Note = {
  tone: NoteTone;
  text: string;
};

type Rule = {
  pattern: RegExp;
  tone: NoteTone;
  say: (match: RegExpExecArray) => string;
};

/** "250 m", or "1.2 km" from a thousand metres up. */
function metres(value: string): string {
  const m = Number(value);
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

const RULES: Rule[] = [
  {
    // optimizer.plan_shape, when the shape was placed away (ADR-0040).
    pattern: /^start moved (.+?) (\w+) of the requested point, where the shape closes/,
    tone: "info",
    say: ([, distance, direction]) =>
      `The route starts ${distance} ${direction} of your start, where the shape fits the roads. Go to “Start here”.`,
  },
  {
    pattern: /^(\d+(?:\.\d+)?) m of the route on steps$/,
    tone: "caution",
    say: ([, m]) => `There are ${metres(m)} of steps along the way.`,
  },
  {
    pattern: /^(\d+(?:\.\d+)?) m of the route on main roads$/,
    tone: "caution",
    say: ([, m]) => `${capitalise(metres(m))} runs along main roads, with traffic.`,
  },
  {
    pattern: /^(\d+(?:\.\d+)?) m of the route in tunnels$/,
    tone: "caution",
    say: ([, m]) => `${capitalise(metres(m))} runs through tunnels.`,
  },
  {
    pattern: /^(\d+)% of the route is on roads already travelled/,
    tone: "info",
    say: ([, share]) => `About ${share}% of the route goes over the same roads twice.`,
  },
  {
    pattern: /^(\d+)% of the route runs next to another stretch of it/,
    tone: "info",
    say: ([, share]) => `About ${share}% of the route runs alongside itself.`,
  },
  {
    pattern: /^distance on roads is ([+-])(\d+)% from the target/,
    tone: "info",
    say: ([, sign, share]) =>
      `The route is ${share}% ${sign === "+" ? "longer" : "shorter"} than asked.`,
  },
  {
    pattern: /^shape similarity [\d.]+ is below [\d.]+/,
    tone: "caution",
    say: () => "The roads here follow the shape only roughly.",
  },
  {
    pattern: /^sparse road network: shape points are (\d+) m from the nearest road/,
    tone: "caution",
    say: () => "Few roads here: the route follows the shape loosely.",
  },
  {
    pattern: /^start is (\d+) m from the nearest road; the route begins there$/,
    tone: "info",
    say: ([, m]) => `The nearest road is ${metres(m)} away: the route begins there.`,
  },
  {
    pattern: /^no road path to shape point \d+; skipped$/,
    tone: "caution",
    say: () => "A bit of the shape has no road to follow, so the route skips it.",
  },
];

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** One warning of the engine, as the app shows it. */
export function toNote(warning: string): Note {
  for (const rule of RULES) {
    const match = rule.pattern.exec(warning);
    if (match) {
      return { tone: rule.tone, text: rule.say(match) };
    }
  }
  return { tone: "info", text: warning };
}

/**
 * All the warnings, as notes: things to watch for first. The same sentence
 * twice (a skipped shape point each time) is shown once.
 */
export function toNotes(warnings: readonly string[]): Note[] {
  const notes: Note[] = [];
  for (const warning of warnings) {
    const note = toNote(warning);
    if (!notes.some((known) => known.text === note.text)) {
      notes.push(note);
    }
  }
  return [
    ...notes.filter((note) => note.tone === "caution"),
    ...notes.filter((note) => note.tone === "info"),
  ];
}
