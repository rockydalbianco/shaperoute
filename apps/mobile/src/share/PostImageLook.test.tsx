/**
 * The post's picture in its three looks, and the day under its title
 * (TASK-450, the user's choices of 2026-11-23).
 */
import type { LatLon } from "@shaperoute/shared-types";
import { render, screen } from "@testing-library/react-native";
import { StyleSheet, type TextStyle, type ViewStyle } from "react-native";

import { dayLabel } from "../activities/activityText";
import { color } from "../theme/tokens";
import { PostImage, POST_RATIO } from "./PostImage";
import { lookColours, lookName, POST_LOOKS, type PostLook } from "./postLook";
import type { PostRun } from "./postRun";
import { DAY, NIGHT } from "./videoStyle";

jest.mock("expo-file-system");

const WIDTH = 360;
const STARTED = "2026-11-21T08:12:00Z";

/** A straight kilometre north of Trento. */
const TRACK: LatLon[] = Array.from({ length: 21 }, (_, i): LatLon => [
  46.06 + (i * 50) / 111_195,
  11.12,
]);

const RUN: PostRun = {
  key: "run-1",
  title: "My first star",
  startedAt: STARTED,
  track: TRACK,
  distanceM: 1000,
  durationMs: 300_000,
};

const nothing = () => {};

async function post(run: PostRun, look?: PostLook) {
  await render(
    <PostImage
      run={run}
      shown={["distance", "time"]}
      stickers={[]}
      width={WIDTH}
      onMoveSticker={nothing}
      onRemoveSticker={nothing}
      {...(look === undefined ? {} : { look })}
    />,
  );
}

function styleOf(node: { props: { style?: unknown } }): ViewStyle & TextStyle {
  return StyleSheet.flatten(node.props.style as ViewStyle & TextStyle);
}

describe("the looks of the post", () => {
  it("are «Yellow», «Night» and «Day», from the tokens alone", () => {
    expect(POST_LOOKS.map(lookName)).toEqual(["Yellow", "Night", "Day"]);
    expect(lookColours("yellow")).toEqual({
      ground: color.accent,
      ink: color.onAccent,
      line: color.onAccent,
    });
    // The app's dark ground with the route's yellow, whatever its tone.
    expect(lookColours("night")).toEqual({
      ground: NIGHT.background,
      ink: NIGHT.text,
      line: color.accent,
    });
    expect(lookColours("day")).toEqual({
      ground: DAY.background,
      ink: DAY.text,
      line: DAY.text,
    });
  });

  it("the post with no look is the yellow it always was", async () => {
    await post(RUN);
    expect(styleOf(screen.getByTestId("post-image")).backgroundColor).toBe(
      color.accent,
    );
    expect(styleOf(screen.getAllByTestId("post-drawing")[0]).backgroundColor).toBe(
      color.onAccent,
    );
    expect(styleOf(screen.getByText("My first star")).color).toBe(color.onAccent);
  });

  it.each(["night", "day"] as const)(
    "«%s» paints the ground, the line and every word",
    async (look) => {
      await post(RUN, look);
      const colours = lookColours(look);
      expect(styleOf(screen.getByTestId("post-image")).backgroundColor).toBe(
        colours.ground,
      );
      for (const stroke of screen.getAllByTestId("post-drawing")) {
        expect(styleOf(stroke).backgroundColor).toBe(colours.line);
      }
      for (const words of [
        "MuW",
        "My first star",
        dayLabel(STARTED),
        "Distance",
        "1.00 km",
        "Time",
        "5:00",
      ]) {
        expect(styleOf(screen.getByText(words)).color).toBe(colours.ink);
      }
    },
  );
});

describe("the day of the run on the post", () => {
  it("is under the title, as the app writes a day", async () => {
    await post(RUN);
    expect(dayLabel(STARTED)).toMatch(/21 Nov 2026$/);
    expect(screen.getByTestId("post-day")).toHaveTextContent(dayLabel(STARTED));
    const page = JSON.stringify(screen.toJSON());
    expect(page.indexOf('"My first star"')).toBeLessThan(
      page.indexOf(JSON.stringify(dayLabel(STARTED))),
    );
  });

  it("stands alone at the end of a run, which has no title yet", async () => {
    await post({ ...RUN, title: null });
    expect(screen.getByTestId("post-day")).toHaveTextContent(dayLabel(STARTED));
    expect(screen.queryByText("My first star")).toBeNull();
  });

  it("is left out for a run that does not know its day", async () => {
    const { startedAt: _startedAt, ...undated } = RUN;
    await post(undated);
    expect(screen.queryByTestId("post-day")).toBeNull();
    expect(screen.getByText("My first star")).toBeOnTheScreen();
  });

  it("is left out for a day that is none", async () => {
    await post({ ...RUN, startedAt: "never" });
    expect(screen.queryByTestId("post-day")).toBeNull();
  });

  it("ends over the drawing with a title of two lines, on any width", async () => {
    await post(RUN);
    const title = styleOf(screen.getByText("My first star"));
    const day = styleOf(screen.getByTestId("post-day"));
    const heading = styleOf(screen.getByTestId("post-heading"));
    const height = WIDTH * POST_RATIO;
    const bottom =
      (heading.top as number) + 2 * (title.lineHeight ?? 0) + (day.lineHeight ?? 0);
    // The drawing begins at a fifth of the post's height (DRAWING_TOP).
    expect(bottom).toBeLessThanOrEqual(height * 0.2);
    // And the logo ends over the title.
    expect(heading.top as number).toBeGreaterThan(WIDTH * (0.08 * 0.6 + 0.09));
  });
});
