import { NUTRITION_ON } from "../nutrition/nutritionOn";
import { APP_PAGES, SKI_PAGES } from "../skimode/skiMode";
import {
  barPagesOf,
  isTrainingMode,
  modeOf,
  pageAfterModeChange,
  pagesOfMode,
  shellPagesOf,
  TRAINING_PAGES,
  trainingPagesOf,
} from "./trainingMode";

describe("the training mode (TASK-490)", () => {
  it("is on with «Gym» only, not with «Stretching»", () => {
    expect(isTrainingMode("gym")).toBe(true);
    expect(isTrainingMode("stretch")).toBe(false);
    expect(isTrainingMode("run")).toBe(false);
    expect(isTrainingMode("ski")).toBe(false);
  });

  it("tells the three modes apart", () => {
    expect(modeOf("gym")).toBe("training");
    expect(modeOf("ski")).toBe("ski");
    expect(modeOf("run")).toBe("app");
    expect(modeOf("stretch")).toBe("app");
  });

  it("gives Today, Workouts, Feed and Profile with «Gym»", () => {
    expect(trainingPagesOf(false)).toEqual([
      "choose",
      "trainingWorkouts",
      "feed",
      "profile",
    ]);
    expect(barPagesOf("gym")).toEqual(trainingPagesOf(NUTRITION_ON));
    expect(TRAINING_PAGES).not.toContain("messages");
    expect(TRAINING_PAGES).not.toContain("explore");
  });

  it("leaves the ski mode and the app as they were", () => {
    expect(barPagesOf("ski")).toBe(SKI_PAGES);
    expect(barPagesOf("run")).toBe(APP_PAGES);
    expect(barPagesOf("stretch")).toBe(APP_PAGES);
  });

  it("opens «Today» when a mode comes on", () => {
    expect(pageAfterModeChange("feed", "app", "training")).toBe("choose");
    expect(pageAfterModeChange("explore", "app", "training")).toBe("choose");
    expect(pageAfterModeChange("choose", "app", "training")).toBeNull();
    expect(pageAfterModeChange("skiDays", "ski", "training")).toBe("choose");
    expect(pageAfterModeChange("trainingWorkouts", "training", "ski")).toBe("choose");
  });

  it("puts «Food» after «Workouts» only while «Nutrition» is on (part D)", () => {
    expect(trainingPagesOf(true)).toEqual([
      "choose",
      "trainingWorkouts",
      "trainingFood",
      "feed",
      "profile",
    ]);
    expect(trainingPagesOf(false)).not.toContain("trainingFood");
    expect(TRAINING_PAGES).toEqual(trainingPagesOf(NUTRITION_ON));
  });

  it("sends the pages the app has no more to «Draw» when it goes off", () => {
    expect(pageAfterModeChange("trainingFood", "training", "app")).toBe("choose");
    expect(pageAfterModeChange("trainingWorkouts", "training", "app")).toBe("choose");
    expect(pageAfterModeChange("skiResorts", "ski", "app")).toBe("choose");
    expect(pageAfterModeChange("feed", "training", "app")).toBeNull();
    expect(pageAfterModeChange("profile", "training", "app")).toBeNull();
    expect(pageAfterModeChange("choose", "training", "app")).toBeNull();
  });

  it("does nothing while the mode stays", () => {
    expect(pageAfterModeChange("trainingWorkouts", "training", "training")).toBeNull();
    expect(pageAfterModeChange("feed", "app", "app")).toBeNull();
  });

  it("builds the bar from the mode's pages and the app's Feed and Profile", () => {
    const app = ["Feed", "Draw", "Messages", "Explore", "Profile"];
    const own = {
      ski: { choose: "Today ski", skiDays: "Days", skiResorts: "Resorts" },
      training: { choose: "Today gym", trainingWorkouts: "Workouts" },
    };
    expect(shellPagesOf("gym", app, own)).toEqual([
      "Today gym",
      "Workouts",
      "Feed",
      "Profile",
    ]);
    expect(shellPagesOf("ski", app, own)).toEqual([
      "Today ski",
      "Days",
      "Resorts",
      "Feed",
      "Profile",
    ]);
    expect(shellPagesOf("run", app, own)).toBe(app);
  });
});

test("the pages of each mode's bar, whatever the sport", () => {
  expect(pagesOfMode("training")).toBe(TRAINING_PAGES);
  expect(pagesOfMode("ski")).toBe(SKI_PAGES);
  expect(pagesOfMode("app")).toBe(APP_PAGES);
});

test("with «Nutrition» on, the bar of «Gym» has «Food» drawn by the mode", () => {
  jest.isolateModules(() => {
    jest.doMock("../nutrition/nutritionOn", () => ({ NUTRITION_ON: true }));
    const mode = jest.requireActual<typeof import("./trainingMode")>("./trainingMode");
    const app = ["Feed", "Draw", "Messages", "Explore", "Profile"];
    expect(mode.barPagesOf("gym")).toContain("trainingFood");
    expect(
      mode.shellPagesOf("gym", app, {
        ski: { choose: "Today ski", skiDays: "Days", skiResorts: "Resorts" },
        training: {
          choose: "Today gym",
          trainingWorkouts: "Workouts",
          trainingFood: "Food",
        },
      }),
    ).toEqual(["Today gym", "Workouts", "Food", "Feed", "Profile"]);
  });
});
