import { render, screen } from "@testing-library/react-native";

import { TAB_ICON_SIZE } from "../tabs/TabBar";
import { color } from "../theme/tokens";
import { SKI_TAB_ICONS, SkiTabIcon } from "./SkiTabIcon";

// The icons of the ski mode's tabs (TASK-429 part A): thin and faint off,
// bold and full on the tab on screen, as the bar's own.

test("each ski tab has its two icons", () => {
  expect(Object.keys(SKI_TAB_ICONS)).toEqual(["today", "days", "resorts"]);
  for (const icon of Object.values(SKI_TAB_ICONS)) {
    expect(icon.off).toBeDefined();
    expect(icon.on).toBeDefined();
    expect(icon.on).not.toBe(icon.off);
  }
});

test("off: the thin icon, faint; on: the bold one, full", async () => {
  await render(<SkiTabIcon name="days" selected={false} />);
  expect(screen.getByTestId("ski-tab-days-off")).toHaveStyle({
    width: TAB_ICON_SIZE,
    tintColor: color.textFaint,
  });
  await render(<SkiTabIcon name="days" selected />);
  expect(screen.getByTestId("ski-tab-days-on")).toHaveStyle({ tintColor: color.text });
});
