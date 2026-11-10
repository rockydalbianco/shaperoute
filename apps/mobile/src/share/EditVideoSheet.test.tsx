import type { LatLon } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { EditVideoSheet } from "./EditVideoSheet";
import { POST_RESULTS, type PostRun } from "./postRun";
import { FIRST_EDIT, type VideoEdit } from "./videoEdit";
import { videoScene } from "./videoScene";

jest.mock("react-native-webview");

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/** A straight line north, a point every 50 m. */
function north(metres: number): LatLon[] {
  return Array.from({ length: metres / 50 + 1 }, (_, i): LatLon => [
    46.07 + (i * 50) / 111_195,
    11.12,
  ]);
}

const RUN: PostRun = {
  key: "run-1",
  title: "Heart in Trento",
  track: north(5200),
  distanceM: 5200,
  durationMs: (28 * 60 + 10) * 1000,
};

async function shown(
  onChange = jest.fn(),
  onClose = jest.fn(),
  edit: VideoEdit = FIRST_EDIT,
) {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <EditVideoSheet
        visible
        run={RUN}
        edit={edit}
        onChange={onChange}
        onClose={onClose}
        sceneOf={(next) => videoScene(RUN, POST_RESULTS, [], next.style, next)}
      />
    </SafeAreaProvider>,
  );
  return { onChange, onClose };
}

describe("EditVideoSheet (TASK-408 C1)", () => {
  it("shows the video's rows, as the board: style, character, line colour, the two emoji rows", async () => {
    await shown();
    expect(screen.getByRole("header", { name: "Edit video" })).toBeOnTheScreen();
    for (const label of [
      "Style",
      "Character",
      "Line colour",
      "Emoji",
      "Along the way",
      "At the end",
    ]) {
      expect(screen.getByText(label)).toBeOnTheScreen();
    }
    expect(screen.getByRole("radio", { name: "Night" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "No animal" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Yellow" })).toBeChecked();
    expect(screen.getByTestId("along-none")).toBeChecked();
    expect(screen.getByTestId("end-none")).toBeChecked();
  });

  it("tells each choice at once, the rest as it was", async () => {
    const { onChange } = await shown();
    await fireEvent.press(screen.getByRole("radio", { name: "Pink" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...FIRST_EDIT, line: "pink" });
    await fireEvent.press(screen.getByTestId("along-⭐"));
    expect(onChange).toHaveBeenLastCalledWith({ ...FIRST_EDIT, along: "⭐" });
    await fireEvent.press(screen.getByTestId("end-🎆"));
    expect(onChange).toHaveBeenLastCalledWith({ ...FIRST_EDIT, end: "🎆" });
    await fireEvent.press(screen.getByRole("radio", { name: "Horse" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...FIRST_EDIT, character: "horse" });
    await fireEvent.press(screen.getByRole("radio", { name: "3D" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...FIRST_EDIT, style: "3d" });
  });

  it("closes on «Done»", async () => {
    const { onClose } = await shown();
    await fireEvent.press(screen.getByTestId("edit-video-done"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("EditVideoSheet, the scenes (TASK-408 C2)", () => {
  it("shows the three scenes in order, the opening off and the whole drawing at the end, as before", async () => {
    await shown();
    expect(screen.getByText("Scenes")).toBeOnTheScreen();
    expect(screen.getByRole("switch", { name: "Opening" })).not.toBeChecked();
    expect(screen.getByRole("switch", { name: "The route" })).toBeChecked();
    expect(screen.getByRole("switch", { name: "Ending" })).toBeChecked();
    expect(screen.getByTestId("ending-drawing")).toBeChecked();
    // What the opening shows only once it is on.
    expect(screen.queryByTestId("opening-drawing")).toBeNull();
    expect(screen.queryByText("At least one scene stays on.")).toBeNull();
  });

  it("turns a scene on and off, and moves it left or right", async () => {
    const { onChange } = await shown();
    await fireEvent.press(screen.getByTestId("scene-opening"));
    expect(onChange).toHaveBeenLastCalledWith({ ...FIRST_EDIT, off: [] });
    await fireEvent.press(screen.getByTestId("scene-ending"));
    expect(onChange).toHaveBeenLastCalledWith({
      ...FIRST_EDIT,
      off: ["opening", "ending"],
    });
    await fireEvent.press(screen.getByRole("button", { name: "Ending, Move left" }));
    expect(onChange).toHaveBeenLastCalledWith({
      ...FIRST_EDIT,
      order: ["opening", "ending", "route"],
    });
    // No arrow past either end.
    expect(screen.queryByTestId("scene-opening-left")).toBeNull();
    expect(screen.queryByTestId("scene-ending-right")).toBeNull();
  });

  it("keeps the last scene on, and says so", async () => {
    const onChange = jest.fn();
    await shown(onChange, jest.fn(), { ...FIRST_EDIT, off: ["opening", "route"] });
    expect(screen.getByText("At least one scene stays on.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId("scene-ending"));
    expect(onChange).toHaveBeenLastCalledWith({
      ...FIRST_EDIT,
      off: ["opening", "route"],
    });
  });

  it("chooses what the opening shows and how it gives way, with the opening on", async () => {
    const onChange = jest.fn();
    const open = { ...FIRST_EDIT, off: [] };
    await shown(onChange, jest.fn(), open);
    expect(screen.getByTestId("opening-drawing")).toBeChecked();
    expect(screen.getByTestId("cut-fade")).toBeChecked();
    await fireEvent.press(screen.getByRole("radio", { name: "Title" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...open, opening: "title" });
    await fireEvent.press(screen.getByRole("radio", { name: "Cut" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...open, cut: "cut" });
  });

  it("chooses the ending", async () => {
    const { onChange } = await shown();
    await fireEvent.press(screen.getByRole("radio", { name: "All three" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...FIRST_EDIT, ending: "all" });
  });

  it("hides the ending's choices with the ending off", async () => {
    await shown(jest.fn(), jest.fn(), { ...FIRST_EDIT, off: ["ending"] });
    expect(screen.getByText("Scenes")).toBeOnTheScreen();
    expect(screen.queryByTestId("ending-drawing")).toBeNull();
  });
});

describe("EditVideoSheet, the camera of the route (TASK-408 C2b)", () => {
  it("offers no camera on the other styles", async () => {
    await shown();
    expect(screen.getByText("Scenes")).toBeOnTheScreen();
    expect(screen.queryByTestId("camera-behind")).toBeNull();
  });

  it("offers no camera on «3D» with the route off", async () => {
    await shown(jest.fn(), jest.fn(), { ...FIRST_EDIT, style: "3d", off: ["route"] });
    expect(screen.getByText("Scenes")).toBeOnTheScreen();
    expect(screen.queryByTestId("camera-behind")).toBeNull();
  });

  it("chooses the camera behind the animal, around the run as before, or the line from above", async () => {
    const onChange = jest.fn();
    const threeD = { ...FIRST_EDIT, style: "3d" as const };
    await shown(onChange, jest.fn(), threeD);
    expect(screen.getByTestId("camera-around")).toBeChecked();
    await fireEvent.press(screen.getByRole("radio", { name: "Camera behind" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...threeD, camera: "behind" });
    await fireEvent.press(screen.getByRole("radio", { name: "Line in 2D" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...threeD, camera: "line" });
  });
});
