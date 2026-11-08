import { moved, SCENES, sceneWindows, switched } from "./videoScenes";

describe("sceneWindows", () => {
  it("gives the opening 3 seconds, the route 6 and the ending 3 with all three on", () => {
    expect(sceneWindows(SCENES, [], 12)).toEqual([
      { scene: "opening", from: 0, to: 3 },
      { scene: "route", from: 3, to: 9 },
      { scene: "ending", from: 9, to: 12 },
    ]);
  });

  it("gives the route the opening's seconds: 9 and 3, the video of before", () => {
    expect(sceneWindows(SCENES, ["opening"], 12)).toEqual([
      { scene: "route", from: 0, to: 9 },
      { scene: "ending", from: 9, to: 12 },
    ]);
  });

  it("gives the route the ending's seconds too", () => {
    expect(sceneWindows(SCENES, ["ending"], 12)).toEqual([
      { scene: "opening", from: 0, to: 3 },
      { scene: "route", from: 3, to: 12 },
    ]);
  });

  it("shares the route's seconds between the others when it is off", () => {
    expect(sceneWindows(SCENES, ["route"], 12)).toEqual([
      { scene: "opening", from: 0, to: 6 },
      { scene: "ending", from: 6, to: 12 },
    ]);
  });

  it("gives one scene alone the whole video", () => {
    expect(sceneWindows(SCENES, ["opening", "route"], 12)).toEqual([
      { scene: "ending", from: 0, to: 12 },
    ]);
  });

  it("follows the order the runner chose", () => {
    expect(sceneWindows(["ending", "route", "opening"], [], 12)).toEqual([
      { scene: "ending", from: 0, to: 3 },
      { scene: "route", from: 3, to: 9 },
      { scene: "opening", from: 9, to: 12 },
    ]);
  });

  it("always ends at 12 seconds, whatever is on", () => {
    const offs = [
      [],
      ["opening"],
      ["route"],
      ["ending"],
      ["opening", "ending"],
    ] as const;
    for (const off of offs) {
      const windows = sceneWindows(SCENES, off, 12);
      expect(windows[0].from).toBe(0);
      expect(windows[windows.length - 1].to).toBe(12);
    }
  });

  it("has nothing to show with every scene off", () => {
    expect(sceneWindows(SCENES, SCENES, 12)).toEqual([]);
  });
});

describe("moved", () => {
  it("moves a scene one place earlier or later", () => {
    expect(moved(SCENES, "ending", -1)).toEqual(["opening", "ending", "route"]);
    expect(moved(SCENES, "opening", 1)).toEqual(["route", "opening", "ending"]);
  });

  it("keeps the order at either end", () => {
    expect(moved(SCENES, "opening", -1)).toEqual([...SCENES]);
    expect(moved(SCENES, "ending", 1)).toEqual([...SCENES]);
  });
});

describe("switched", () => {
  it("turns a scene off and on again", () => {
    expect(switched([], "opening", false)).toEqual(["opening"]);
    expect(switched(["opening"], "opening", true)).toEqual([]);
  });

  it("keeps the last scene on", () => {
    expect(switched(["opening", "route"], "ending", false)).toEqual([
      "opening",
      "route",
    ]);
  });
});
