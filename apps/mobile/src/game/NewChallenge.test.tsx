import catalog from "@shaperoute/shared-types/fixtures/game-catalog.json";
import type { GameCatalog } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ComponentProps } from "react";

import { NewChallenge } from "./NewChallenge";

const CATALOG = catalog as GameCatalog;
const onStart = jest.fn();
const onCancel = jest.fn();

type Props = ComponentProps<typeof NewChallenge>;

async function shown(props: Partial<Props> = {}) {
  return render(
    <NewChallenge
      catalog={CATALOG}
      members={2}
      units="km"
      language="en"
      sending={false}
      problem={null}
      onStart={onStart}
      onCancel={onCancel}
      {...props}
    />,
  );
}

async function press(testID: string, times = 1) {
  for (let i = 0; i < times; i += 1) {
    await fireEvent.press(screen.getByTestId(testID));
  }
}

beforeEach(() => {
  onStart.mockReset();
  onCancel.mockReset();
});

test("it starts from the first shape, a piece a member, 5 km each and 7 days", async () => {
  await shown();
  expect(screen.getByTestId("new-shape-triangle")).toBeSelected();
  // The shapes by collection (TASK-423): the first one's shown.
  expect(screen.getByTestId("new-collection-geometry")).toBeSelected();
  expect(screen.queryByTestId("new-shape-lightning")).toBeNull();
  expect(screen.getByTestId("new-pieces")).toHaveTextContent("2");
  expect(screen.getByTestId("new-distance")).toHaveTextContent("5 km");
  expect(screen.getByTestId("new-days")).toHaveTextContent("7");
  expect(screen.getByTestId("new-summary")).toHaveTextContent(
    "2 pieces · 5 km in total each",
  );
  await press("new-collection-sky");
  expect(screen.getByTestId("new-collection-sky")).toBeSelected();
  expect(screen.queryByTestId("new-shape-triangle")).toBeNull();
  await press("new-shape-lightning");
  expect(screen.getByTestId("new-shape-lightning")).toBeSelected();
  await press("new-collection-geometry");
  expect(screen.getByTestId("new-shape-triangle")).not.toBeSelected();
  await press("new-start");
  expect(onStart).toHaveBeenCalledWith({
    shape_id: "lightning",
    pieces: 2,
    piece: { kind: "distance", total_m: 5000 },
    days: 7,
  });
});

test("the steppers keep inside the limits of the API", async () => {
  // Up to 20 pieces and 30 days (TASK-423 part C).
  await shown({ members: 25 });
  expect(screen.getByTestId("new-pieces")).toHaveTextContent("20");
  await press("new-pieces-more");
  expect(screen.getByTestId("new-pieces")).toHaveTextContent("20");
  await press("new-pieces-less");
  expect(screen.getByTestId("new-pieces")).toHaveTextContent("19");
  await press("new-days-more", 30);
  expect(screen.getByTestId("new-days")).toHaveTextContent("30");
  await press("new-days-less", 40);
  expect(screen.getByTestId("new-days")).toHaveTextContent("1");
  await press("new-distance-less", 6);
  expect(screen.getByTestId("new-distance")).toHaveTextContent("1 km");
  await press("new-distance-more", 60);
  expect(screen.getByTestId("new-distance")).toHaveTextContent("50 km");
  await screen.unmount();
  await shown({ members: 1 });
  expect(screen.getByTestId("new-pieces")).toHaveTextContent("2");
});

test("a fast piece: 1 or 5 km under a pace, by 15 s", async () => {
  await shown();
  await fireEvent.press(screen.getByText("Fast"));
  expect(screen.queryByTestId("new-distance")).toBeNull();
  expect(screen.getByTestId("new-pace")).toHaveTextContent("5:00 /km");
  await press("new-pace-less");
  expect(screen.getByTestId("new-pace")).toHaveTextContent("5:15 /km");
  await press("new-pace-more", 2);
  expect(screen.getByTestId("new-pace")).toHaveTextContent("4:45 /km");
  expect(screen.getByTestId("new-summary")).toHaveTextContent(
    "2 pieces · 1 km under 4:45 /km each",
  );
  await fireEvent.press(screen.getByText("5 km"));
  await press("new-start");
  expect(onStart).toHaveBeenCalledWith({
    shape_id: "triangle",
    pieces: 2,
    piece: { kind: "pace", distance_m: 5000, pace_s: 285 },
    days: 7,
  });
  // No faster than 2:30 a kilometre, no slower than 15:00.
  await press("new-pace-more", 20);
  expect(screen.getByTestId("new-pace")).toHaveTextContent("2:30 /km");
  await press("new-pace-less", 60);
  expect(screen.getByTestId("new-pace")).toHaveTextContent("15:00 /km");
});

test("in miles the distance and the pace are said in miles, and sent in metres", async () => {
  await shown({ units: "mi" });
  expect(screen.getByTestId("new-distance")).toHaveTextContent("5 mi");
  await press("new-start");
  expect(onStart).toHaveBeenLastCalledWith(
    expect.objectContaining({ piece: { kind: "distance", total_m: 8047 } }),
  );
  await fireEvent.press(screen.getByText("Fast"));
  expect(screen.getByTestId("new-pace")).toHaveTextContent("8:03 /mi");
  // A step of 15 s a mile is 9.3 s a kilometre, sent whole: the pace shown
  // is the one the API will keep.
  await press("new-pace-less");
  expect(screen.getByTestId("new-pace")).toHaveTextContent("8:17 /mi");
  await press("new-start");
  expect(onStart).toHaveBeenLastCalledWith(
    expect.objectContaining({ piece: { kind: "pace", distance_m: 1000, pace_s: 309 } }),
  );
});

test("on its way the start waits, a refusal is said, and «Cancel» closes", async () => {
  await shown({
    sending: true,
    problem: "The team has a challenge going already: wait for it to end.",
  });
  await press("new-start");
  expect(onStart).not.toHaveBeenCalled();
  expect(screen.getByTestId("new-problem")).toHaveTextContent(
    "The team has a challenge going already: wait for it to end.",
  );
  await press("new-cancel");
  expect(onCancel).toHaveBeenCalledTimes(1);
});

test("an older API's catalog, without collections: all the shapes in one row", async () => {
  await shown({
    catalog: {
      ...CATALOG,
      collections: undefined,
      shapes: CATALOG.shapes.map(({ collection: _collection, ...shape }) => shape),
    },
  });
  expect(screen.queryByTestId("new-collection-geometry")).toBeNull();
  expect(screen.getByTestId("new-shape-triangle")).toBeSelected();
  expect(screen.getByTestId("new-shape-lightning")).not.toBeSelected();
});
