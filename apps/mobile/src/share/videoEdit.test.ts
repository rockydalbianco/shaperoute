import { DAY, NIGHT } from "./videoStyle";
import { videoLine } from "../theme/tokens";
import {
  FIRST_EDIT,
  LINE_COLOURS,
  lineColourName,
  lineColourOf,
  VIDEO_EMOJI,
} from "./videoEdit";

describe("the choices of «Edit video» (TASK-408 C1)", () => {
  it("start as the video was: Night, no animal, the yellow line, no emoji", () => {
    expect(FIRST_EDIT).toEqual({
      style: "night",
      character: null,
      line: "yellow",
      along: null,
      end: null,
      order: ["opening", "route", "ending"],
      off: ["opening"],
      opening: "drawing",
      cut: "fade",
      ending: "drawing",
    });
  });

  it("start with the scenes of before: no opening, the route, the whole drawing (C2, choice 12)", () => {
    expect(FIRST_EDIT.off).toEqual(["opening"]);
    expect(FIRST_EDIT.ending).toBe("drawing");
  });

  it("offer five line colours from the tokens, the yellow the palette's own", () => {
    expect(LINE_COLOURS).toEqual(["yellow", "light_blue", "pink", "green", "white"]);
    expect(lineColourOf("yellow", NIGHT)).toBe(NIGHT.accent);
    expect(lineColourOf("yellow", DAY)).toBe(DAY.accent);
    expect(lineColourOf("light_blue", NIGHT)).toBe(videoLine.lightBlue);
    expect(lineColourOf("pink", DAY)).toBe(videoLine.pink);
    expect(lineColourOf("green", NIGHT)).toBe(videoLine.green);
    expect(lineColourOf("white", NIGHT)).toBe(videoLine.white);
    expect(LINE_COLOURS.map(lineColourName)).toEqual([
      "Yellow",
      "Light blue",
      "Pink",
      "Green",
      "White",
    ]);
  });

  it("offer the emoji of the prompt's table", () => {
    expect(VIDEO_EMOJI).toEqual(["🎆", "⭐", "❤️", "🔥", "⚡", "🎉", "🏆"]);
  });
});
