/**
 * The sports' line signs (TASK-510): every sport has one, no two sports
 * share it, and it is drawn in a token's colour, read only where it stands
 * alone.
 */
import { render, screen } from "@testing-library/react-native";

import { withoutRouteIcon } from "../screens/RunNoRouteButton";
import { SPORTS } from "../settings/sport";
import { SPORT_PROFILES } from "../sports";
import { color } from "../theme/tokens";
import { SportIcon, SportLine } from "./SportIcon";
import { POOL_ICON, SPORT_ICONS, sportIconOf } from "./sportIcons";

const key = (source: unknown) => JSON.stringify(source);

test("every sport of the app has its sign, none an emoji", () => {
  for (const profile of SPORT_PROFILES) {
    expect(SPORT_ICONS[profile.activity]).toBeDefined();
  }
});

test("no two sports share a sign, nor the pool the open water's", () => {
  const signs = Object.values(SPORT_ICONS).map(key);
  expect(new Set(signs).size).toBe(signs.length);
  expect(signs).not.toContain(key(POOL_ICON));
});

test("hiking and ski touring no longer share a mountain, snowshoes no snowflake", () => {
  expect(key(SPORT_ICONS.hiking)).not.toBe(key(SPORT_ICONS.ski_touring));
  expect(key(SPORT_ICONS.snowshoeing)).toBe(
    key(require("../../assets/ui/sports/snowshoe.png")),
  );
});

test("an activity the app does not know shows a run's sign", () => {
  expect(sportIconOf("kitesurfing")).toBe(SPORT_ICONS.running);
  expect(sportIconOf(undefined)).toBe(SPORT_ICONS.running);
});

test("each sport's button «… without a route» names an activity with a sign", () => {
  for (const option of SPORTS) {
    expect(sportIconOf(withoutRouteIcon(option.id))).toBe(
      SPORT_ICONS[withoutRouteIcon(option.id)],
    );
  }
  expect(withoutRouteIcon("bike")).toBe("cycling");
  expect(withoutRouteIcon("snowshoe")).toBe("snowshoeing");
});

test("a sign takes a token's colour and is not read beside its name", async () => {
  await render(<SportIcon activity="skiing" size={28} testID="sign" />);
  const sign = screen.getByTestId("sign", { includeHiddenElements: true });
  expect(sign).toHaveStyle({ width: 28, height: 28, tintColor: color.text });
  expect(sign.props.source).toBe(SPORT_ICONS.skiing);
  expect(sign.props.accessible).toBe(false);
});

test("a sign standing alone is read with the sport's name", async () => {
  await render(
    <SportIcon
      activity="paragliding"
      size={26}
      tint={color.textMuted}
      label="Paragliding"
    />,
  );
  const sign = screen.getByLabelText("Paragliding");
  expect(sign).toHaveStyle({ tintColor: color.textMuted });
});

test("a line keeps its words and draws the sign before them", async () => {
  await render(
    <SportLine
      activity="gym"
      size={15}
      tint={color.textMuted}
      textStyle={{}}
      testID="line"
    >
      Gym
    </SportLine>,
  );
  expect(screen.getByTestId("line")).toHaveTextContent("Gym");
  expect(screen.queryByText(/🏋/)).toBeNull();
});
