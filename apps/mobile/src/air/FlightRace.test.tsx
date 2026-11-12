/**
 * A race on foot and in the air on the screens (TASK-305 part R6b, the
 * user's choice of 2026-11-12, «Dentro Paragliding»): «On foot | In the
 * air» while it goes, a touch that corrects it; at the end the total and a
 * line for each kind; in the Feed «On foot {time} · In the air {time}»; on
 * the post's page a row for each. In the words the user approved.
 */
import type { FeedPost, LatLon } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Alert } from "react-native";

import { shownPost } from "../feed/feedPosts";
import { summaryRows } from "../feed/postSections";
import { translate } from "../i18n/translate";
import type { FreeRun } from "../navigation/freeRun";
import { addFix, emptyTrack, type Track } from "../navigation/trackRecorder";
import { FlightFinishCard } from "./FlightFinishCard";
import { FlightLive } from "./FlightLive";
import { postSplit, postSplitLine, splitLine } from "./flightSplit";
import { phaseMarksOf, resetPhaseMarks } from "./phaseMarks";

jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get exists(): boolean {
      return files.has(this.uri);
    }
    create(): void {
      files.set(this.uri, "");
    }
    write(text: string): void {
      files.set(this.uri, text);
    }
    textSync(): string {
      return files.get(this.uri) ?? "";
    }
    delete(): void {
      files.delete(this.uri);
    }
  }
  return { File, Paths: { document: { uri: "file:///documents/" } } };
});

const START: LatLon = [45.73, 10.83];
const METRE = 1 / 111_195;
const T0 = 1_794_470_400_000;

/** Up on foot `footS` seconds at 1.5 m/s, climbing 0.25 m/s, a fix every
 * 2 s; then `airS` seconds gliding at 10 m/s, sinking 1.6 m/s. */
function race(footS: number, airS: number): Track {
  let track = emptyTrack();
  for (let s = 0; s <= footS; s += 2) {
    track = addFix(track, {
      point: [START[0] + 1.5 * s * METRE, START[1]],
      timeMs: T0 + s * 1000,
      accuracyM: 5,
      altitudeM: 1500 + 0.25 * s,
    });
  }
  const top = 1500 + 0.25 * footS;
  for (let s = 2; s <= airS; s += 2) {
    track = addFix(track, {
      point: [START[0] + (1.5 * footS + 10 * s) * METRE, START[1]],
      timeMs: T0 + (footS + s) * 1000,
      accuracyM: 5,
      altitudeM: top - 1.6 * s,
    });
  }
  return track;
}

function ended(track: Track): FreeRun {
  return { version: 1, route: [], track, status: "stopped" };
}

beforeEach(() => {
  jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
});

afterEach(() => {
  resetPhaseMarks();
});

test("at the end of a race: the total, then on foot and in the air", async () => {
  await render(
    <FlightFinishCard
      run={ended(race(1800, 600))}
      activity="paragliding"
      onDone={jest.fn()}
    />,
  );
  const split = screen.getByTestId("flight-split");
  expect(split).toHaveTextContent(/Total/);
  expect(split).toHaveTextContent(/On foot\s*30:\d\d · 2\.\d\d km · \+4\d\d m/);
  expect(split).toHaveTextContent(/In the air\s*\d\d:\d\d · \d\.\d\d km · 19\d\d m/);
});

test("a flight alone ends as before, without the split", async () => {
  await render(
    <FlightFinishCard
      run={ended(race(0, 600))}
      activity="paragliding"
      onDone={jest.fn()}
    />,
  );
  expect(screen.queryByTestId("flight-split")).toBeNull();
});

test("on foot: the part's numbers and «On foot | In the air»; a touch corrects it", async () => {
  const track = race(600, 0);
  const { rerender } = await render(<FlightLive track={track} live />);
  expect(
    screen.getByText("MuW switches by itself; touch to correct it."),
  ).toBeOnTheScreen();
  expect(screen.getByLabelText(/^Avg pace/)).toBeOnTheScreen();
  expect(screen.queryByLabelText(/^Vario/)).toBeNull();
  await fireEvent.press(screen.getByText("In the air"));
  expect(phaseMarksOf(T0).map((mark) => mark.kind)).toEqual(["air"]);
  await rerender(<FlightLive track={track} live />);
  expect(screen.getByLabelText(/^Vario/)).toBeOnTheScreen();
});

test("in the Feed and on the post's page, the two times", () => {
  const split = {
    foot: { seconds: 7120, metres: 9800, climb_m: 1240, max_alt_m: 1960 },
    air: { seconds: 6210, metres: 31200, climb_m: 620, max_alt_m: 2410 },
  };
  expect(splitLine(7_120_000, 6_210_000)).toBe("On foot 1:58:40 · In the air 1:43:30");
  const post = shownPost({
    id: "d1",
    author: { username: "pilot" },
    title: null,
    started_at: "2026-11-15T09:00:00Z",
    place: null,
    shape: null,
    word: null,
    route_title: null,
    distance_m: 41_000,
    duration_s: 13_330,
    score: null,
    track_preview: [],
    activity: "paragliding",
    flight_split: split,
  } as unknown as FeedPost);
  expect(postSplit(post)).toEqual(split);
  expect(postSplitLine(split)).toBe("On foot 1:58:40 · In the air 1:43:30");
  const rows = summaryRows(post, "km", null, {
    splits_km: null,
    splits_mile: null,
    elevation: null,
    cadence_spm: null,
    kcal: null,
    heart: null,
    flight_split: split,
  });
  expect(rows.map((row) => `${row.label} ${row.value}`)).toEqual(
    expect.arrayContaining(["On foot 1:58:40", "In the air 1:43:30"]),
  );
  // A post without it shows none.
  expect(
    postSplit(
      shownPost({ ...(post.drawing as FeedPost), flight_split: null } as FeedPost),
    ),
  ).toBeNull();
});

test("the words, in each language", () => {
  const words = [
    "In the air",
    "MuW switches by itself; touch to correct it.",
    "On foot {foot} · In the air {air}",
  ];
  expect(
    (["it", "de", "fr", "es"] as const).map((language) =>
      words.map((word) => translate(language, word)),
    ),
  ).toEqual([
    [
      "In volo",
      "MuW cambia da sola; tocca per correggere.",
      "A piedi {foot} · In volo {air}",
    ],
    [
      "In der Luft",
      "MuW wechselt von selbst; tippe, um es zu korrigieren.",
      "Zu Fuß {foot} · In der Luft {air}",
    ],
    [
      "En vol",
      "MuW change tout seul ; touchez pour corriger.",
      "À pied {foot} · En vol {air}",
    ],
    [
      "En el aire",
      "MuW cambia solo; toca para corregir.",
      "A pie {foot} · En el aire {air}",
    ],
  ]);
});
