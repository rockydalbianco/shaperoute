/**
 * The calories in red wherever they are shown (TASK-424 part C3, the
 * user's choice of 2026-11-10: «segnate con colore rosso in tutte»): the
 * tiles of a run and of a day on the snow, the line of facts of a post and
 * of an activity, the boxes and rows of a post, the gym's yellow tile.
 */
import { render, screen } from "@testing-library/react-native";

import { FactsText } from "../feed/FactsText";
import { SummaryBoxes } from "../feed/SummaryBoxes";
import { GymTile } from "../gym/GymTile";
import { Tile } from "../screens/RunPanel";
import { color } from "./tokens";

test("a tile of calories is red, number and unit; another tile is not", async () => {
  await render(
    <>
      <Tile label="Calories" value="187" unit="kcal" energy />
      <Tile label="Time" value="12:34" />
    </>,
  );
  expect(screen.getByText("187")).toHaveStyle({ color: color.energy });
  expect(screen.getByText("kcal")).toHaveStyle({ color: color.energy });
  expect(screen.getByText("12:34")).toHaveStyle({ color: color.text });
});

test("a line of facts has its calories in red, and only them", async () => {
  await render(<FactsText facts="Star · 4.0 km · 19 min · 280 kcal" kcal="280 kcal" />);
  expect(screen.getByTestId("facts-kcal")).toHaveStyle({ color: color.energy });
  expect(screen.getByTestId("facts-kcal")).toHaveTextContent("280 kcal");
  // One line still, for a screen reader.
  expect(screen.getByText(/Star · 4\.0 km · 19 min · /)).toBeOnTheScreen();
});

test("a line without calories, or not ending with them, has no red", async () => {
  await render(
    <>
      <FactsText facts="Star · 4.0 km · 19 min" kcal={null} />
      <FactsText facts="Opening…" kcal="280 kcal" />
    </>,
  );
  expect(screen.queryByTestId("facts-kcal")).toBeNull();
});

test("over a photo the red is the one that reads on the dark", async () => {
  await render(
    <FactsText
      facts="4.0 km · 280 kcal"
      kcal="280 kcal"
      energyColor={color.energyOnScrim}
    />,
  );
  expect(screen.getByTestId("facts-kcal")).toHaveStyle({ color: color.energyOnScrim });
});

test("a post's box of calories is red", async () => {
  await render(
    <SummaryBoxes
      rows={[
        { label: "Distance", value: "4.0 km" },
        { label: "Calories", value: "280 kcal", energy: true },
      ]}
    />,
  );
  expect(screen.getByText("280 kcal")).toHaveStyle({ color: color.energy });
  expect(screen.getByText("4.0 km")).toHaveStyle({ color: color.text });
});

test("on the gym's yellow tile the calories are a red that reads on it", async () => {
  await render(<GymTile width={200} height={200} durationS={3600} kcal="184 kcal" />);
  expect(
    screen.getByTestId("gym-tile-kcal", { includeHiddenElements: true }),
  ).toHaveStyle({
    color: color.energyOnAccent,
  });
});
