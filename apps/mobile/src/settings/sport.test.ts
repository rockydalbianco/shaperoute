import {
  activityOf,
  ALL_SPORTS,
  canChoose,
  DEFAULT_SPORT,
  isRecordOnly,
  loadSport,
  runActivityOf,
  saveSport,
  shownSports,
  SPORT_FILE,
  SPORTS,
  type SportOption,
  subscribeSport,
  withoutRouteLabel,
} from "./sport";

// The phone's documents folder, in memory: what is written stays there for
// the next read, as after closing the app.
jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  const state = { failing: false };
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get exists(): boolean {
      return files.has(this.uri);
    }
    create(): void {
      if (state.failing) {
        throw new Error("No space left on device");
      }
      files.set(this.uri, "");
    }
    write(text: string): void {
      files.set(this.uri, text);
    }
    textSync(): string {
      return files.get(this.uri) ?? "";
    }
  }
  return { File, Paths: { document: { uri: "file:///documents/" } }, files, state };
});

const disk = jest.requireMock<{
  files: Map<string, string>;
  state: { failing: boolean };
}>("expo-file-system");
const SPORT_URI = `file:///documents/${SPORT_FILE}`;

/** As before TASK-190: only run ready. */
const RUN_ONLY: SportOption[] = SPORTS.map((option) =>
  option.id === "run" ? option : { ...option, ready: false },
);

beforeEach(() => {
  disk.files.clear();
  disk.state.failing = false;
});

test("walk, run, bike, paddle, swim and the alpine ski can be chosen (TASK-190, TASK-191, TASK-323, TASK-371, TASK-375)", () => {
  // By family: on foot, on wheels, on the water, on the snow (TASK-371).
  expect(SPORTS.map((option) => option.name)).toEqual([
    "Walk",
    "Run",
    "Hike",
    "Bike",
    "Gravel",
    "MTB",
    "Roller",
    "Wheelchair & stroller",
    "Paddle",
    "Swim",
    "Ski",
    "Cross-country ski",
    "Ski touring",
    "Gym",
    "Paragliding",
  ]);
  expect(SPORTS.filter((option) => option.ready).map((option) => option.id)).toEqual([
    "walk",
    "run",
    "hike",
    "bike",
    "gravel",
    "mtb",
    "roller",
    "paddle",
    "swim",
    "ski",
    "skimo",
    "gym",
    "paragliding",
  ]);
  expect(canChoose("run")).toBe(true);
  expect(canChoose("bike")).toBe(true);
  expect(canChoose("paddle")).toBe(true);
  expect(canChoose("swim")).toBe(true);
  expect(canChoose("ski")).toBe(true);
  // And a walk (TASK-371).
  expect(canChoose("walk")).toBe(true);
  // And a gravel and an MTB ride (TASK-378 part C).
  expect(canChoose("gravel")).toBe(true);
  expect(canChoose("mtb")).toBe(true);
  // And a skate, since the server has TASK-380 part A.
  expect(canChoose("roller")).toBe(true);
  // And a ski tour, with its phases and its VAM (TASK-415 part B).
  expect(canChoose("skimo")).toBe(true);
  expect(canChoose("xc_ski")).toBe(false);
  // Not a wheelchair yet: «Soon» until the server has TASK-414 part A.
  expect(canChoose("wheelchair")).toBe(false);
  expect(canChoose("golf")).toBe(false);
});

test("«Paragliding» comes last, recorded without a shape since TASK-305 R2", () => {
  expect(SPORTS.at(-1)).toEqual({
    id: "paragliding",
    emoji: "🪂",
    name: "Paragliding",
    ready: true,
    recordOnly: true,
  });
  expect(canChoose("paragliding")).toBe(true);
  saveSport("paragliding");
  expect(loadSport()).toBe("paragliding");
  // Saved as a flight; no route is asked: «Draw» asks a run, never shown.
  expect(runActivityOf("paragliding")).toBe("paragliding");
  expect(activityOf("paragliding")).toBe("running");
  expect(withoutRouteLabel("paragliding")).toBe("Record your flight");
});

test("«Swim» 🏊 comes after «Paddle», on since the server swims (TASK-323)", () => {
  const index = SPORTS.findIndex((option) => option.id === "swim");
  expect(SPORTS[index - 1]?.id).toBe("paddle");
  expect(SPORTS[index]).toEqual({
    id: "swim",
    emoji: "🏊",
    name: "Swim",
    ready: true,
  });
  expect(canChoose("swim")).toBe(true);
  // Kept for the next opening, as any sport that is ready.
  saveSport("swim");
  expect(loadSport()).toBe("swim");
  expect(loadSport(RUN_ONLY)).toBe("run");
  // Asked as a swim since C2, in its own words.
  expect(activityOf("swim")).toBe("swimming");
  expect(withoutRouteLabel("swim")).toBe("Swim without a route");
});

test("«Walk» 🚶 comes first, on since the server walks (TASK-371)", () => {
  expect(SPORTS[0]).toEqual({
    id: "walk",
    emoji: "🚶",
    name: "Walk",
    ready: true,
  });
  expect(shownSports(ALL_SPORTS, true)[0]?.id).toBe("walk");
  expect(canChoose("walk")).toBe(true);
  saveSport("walk");
  expect(loadSport()).toBe("walk");
  // Asked as a walk, drawn as a run on the foot network (part A).
  expect(activityOf("walk")).toBe("walking");
  expect(withoutRouteLabel("walk")).toBe("Walk without a route");
});

test("«Gym» 🏋️ before «Paragliding», on in the store builds too (TASK-385 B)", () => {
  // The user's «ok accendi» (2026-11-05).
  expect(ALL_SPORTS.find((option) => option.id === "gym")).toEqual({
    id: "gym",
    emoji: "🏋️",
    name: "Gym",
    ready: true,
  });
  expect(shownSports(ALL_SPORTS, true).some((option) => option.id === "gym")).toBe(
    true,
  );
  const index = SPORTS.findIndex((option) => option.id === "gym");
  expect(SPORTS[index + 1]?.id).toBe("paragliding");
  expect(canChoose("gym")).toBe(true);
  saveSport("gym");
  expect(loadSport()).toBe("gym");
  // No route, no shape, no GPS: saved as "gym", started by «Start workout».
  expect(runActivityOf("gym")).toBe("gym");
  expect(isRecordOnly("gym")).toBe(false);
  expect(withoutRouteLabel("gym")).toBe("Start workout");
});

test("«Draw» asks for a bike route with «Bike», the water with «Paddle»", () => {
  expect(activityOf("run")).toBe("running");
  expect(activityOf("bike")).toBe("cycling");
  expect(activityOf("paddle")).toBe("paddling");
});

test("the way out with the track only says the sport", () => {
  expect(withoutRouteLabel("run")).toBe("Run without a route");
  expect(withoutRouteLabel("bike")).toBe("Ride without a route");
  expect(withoutRouteLabel("paddle")).toBe("Paddle without a route");
});

test("with nothing chosen, the sport is run", () => {
  expect(DEFAULT_SPORT).toBe("run");
  expect(loadSport()).toBe("run");
});

test("a sport that is ready is kept for the next opening", () => {
  saveSport("bike");
  expect(disk.files.get(SPORT_URI)).toBe('{"sport":"bike"}');
  expect(loadSport()).toBe("bike");
});

test("a saved sport that is not ready reads as run", () => {
  // «Paddle» kept since TASK-191, read by an app that has it and by one
  // without it.
  saveSport("paddle");
  expect(loadSport()).toBe("paddle");
  expect(loadSport(RUN_ONLY)).toBe("run");
  // As a phone that kept «Bike» reads in an app without it.
  saveSport("bike");
  expect(loadSport(RUN_ONLY)).toBe("run");
});

test("a file that does not read gives run", () => {
  for (const text of ["", "not json", "null", '"bike"', '{"sport":"golf"}', "{}"]) {
    disk.files.set(SPORT_URI, text);
    expect(loadSport()).toBe("run");
  }
});

test("a phone that refuses to write breaks nothing", () => {
  disk.state.failing = true;
  expect(() => saveSport("run")).not.toThrow();
  expect(loadSport()).toBe("run");
});

test("each sport saved is told to whoever listens, until they stop", () => {
  const heard: string[] = [];
  const stop = subscribeSport((sport) => heard.push(sport));
  saveSport("bike");
  saveSport("run");
  stop();
  saveSport("bike");
  expect(heard).toEqual(["bike", "run"]);
});

test("a choice the phone could not keep is still told: it holds while open", () => {
  disk.state.failing = true;
  const heard: string[] = [];
  const stop = subscribeSport((sport) => heard.push(sport));
  saveSport("bike");
  stop();
  expect(heard).toEqual(["bike"]);
  expect(loadSport()).toBe("run");
});
