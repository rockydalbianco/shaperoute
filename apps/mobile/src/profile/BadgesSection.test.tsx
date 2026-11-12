import { render, screen } from "@testing-library/react-native";

import { badgeHow, BadgesSection } from "./BadgesSection";

test("every badge is there with the line that says how it is earned", async () => {
  await render(<BadgesSection badges={[]} />);
  expect(screen.getByRole("header", { name: "Badges" })).toBeOnTheScreen();
  expect(screen.getByTestId("badges-first_drawing")).toHaveTextContent(
    "🔒First drawingRecord a run with MuW and publish its drawing.",
  );
  expect(screen.getByTestId("badges-ten_drawings")).toHaveTextContent(
    "🔒10 drawingsPublish 10 drawings of runs recorded with MuW.",
  );
  expect(screen.getByTestId("badges-long_drawing")).toHaveTextContent(
    "🔒30 km drawingPublish the drawing of a run of 30 km or more.",
  );
});

test("an earned badge has its own sign, the others the lock", async () => {
  await render(<BadgesSection badges={["first_drawing"]} />);
  expect(screen.getByTestId("badges-first_drawing")).toHaveTextContent(/^✏️/);
  expect(screen.getByTestId("badges-ten_drawings")).toHaveTextContent(/^🔒/);
});

test("earned or not is said in words too, not by the sign alone", async () => {
  await render(<BadgesSection badges={["first_drawing"]} />);
  expect(
    screen.getByLabelText(
      "First drawing. Record a run with MuW and publish its drawing.",
    ),
  ).toBeOnTheScreen();
  expect(
    screen.getByLabelText(
      "Not earned yet: 10 drawings. Publish 10 drawings of runs recorded with MuW.",
    ),
  ).toBeOnTheScreen();
});

test("an API older than the badges: no section", async () => {
  await render(<BadgesSection badges={null} />);
  expect(screen.queryByTestId("badges-section")).toBeNull();
});

test("the long drawing is said in the app's units", () => {
  expect(badgeHow("long_drawing", "km")).toBe(
    "Publish the drawing of a run of 30 km or more.",
  );
  expect(badgeHow("long_drawing", "mi")).toBe(
    "Publish the drawing of a run of 19 mi or more.",
  );
});
