import type { LatLon } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { EditVideoSheet } from "./EditVideoSheet";
import type { PostRun } from "./postRun";
import { FIRST_EDIT } from "./videoEdit";

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

async function shown(onChange = jest.fn(), onClose = jest.fn()) {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <EditVideoSheet
        visible
        run={RUN}
        edit={FIRST_EDIT}
        onChange={onChange}
        onClose={onClose}
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
