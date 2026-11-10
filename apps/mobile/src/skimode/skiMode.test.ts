import {
  APP_PAGES,
  barPagesOf,
  isSkiMode,
  pageAfterModeChange,
  SKI_PAGES,
} from "./skiMode";

describe("the ski mode (TASK-429)", () => {
  it("is on with «Ski» only", () => {
    expect(isSkiMode("ski")).toBe(true);
    expect(isSkiMode("run")).toBe(false);
    expect(isSkiMode("xc_ski")).toBe(false);
    expect(isSkiMode("hike")).toBe(false);
  });

  it("gives the ski tabs with «Ski» and the app's own with any other sport", () => {
    expect(barPagesOf("ski")).toEqual([
      "choose",
      "skiDays",
      "skiResorts",
      "feed",
      "profile",
    ]);
    expect(barPagesOf("run")).toEqual([
      "feed",
      "choose",
      "messages",
      "explore",
      "profile",
    ]);
    expect(barPagesOf("bike")).toBe(APP_PAGES);
  });

  it("keeps five tabs, and no tab for the messages in the ski mode", () => {
    expect(SKI_PAGES).toHaveLength(APP_PAGES.length);
    expect(SKI_PAGES).not.toContain("messages");
    expect(SKI_PAGES).not.toContain("explore");
  });

  it("opens «Today» when the mode comes on", () => {
    expect(pageAfterModeChange("feed", false, true)).toBe("choose");
    expect(pageAfterModeChange("profile", false, true)).toBe("choose");
    expect(pageAfterModeChange("choose", false, true)).toBeNull();
  });

  it("leaves «Days» and «Resorts» for «Draw» when the mode goes off", () => {
    expect(pageAfterModeChange("skiDays", true, false)).toBe("choose");
    expect(pageAfterModeChange("skiResorts", true, false)).toBe("choose");
    expect(pageAfterModeChange("feed", true, false)).toBeNull();
    expect(pageAfterModeChange("choose", true, false)).toBeNull();
  });

  it("does nothing while the mode stays as it is", () => {
    expect(pageAfterModeChange("feed", false, false)).toBeNull();
    expect(pageAfterModeChange("skiDays", true, true)).toBeNull();
  });
});
