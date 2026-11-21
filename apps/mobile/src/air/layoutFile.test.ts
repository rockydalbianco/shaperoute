/**
 * A layout as a file (TASK-479 part B2): written, read back, and a file
 * that is not a layout, or of a later app, refused.
 */
import { profileOf } from "./flightLayout";
import { LAYOUT_KIND, LAYOUT_VERSION, layoutText, readLayout } from "./layoutFile";

jest.mock("expo-file-system", () => ({
  File: class {},
  Paths: { cache: { uri: "file:///cache/" } },
}));

describe("layout files", () => {
  it("read back the profile written", () => {
    const profile = profileOf("xc", 3);
    profile.pages[0] = [{ widget: "vario", col: 0, row: 0, w: 2, h: 1, unit: "kt" }];
    expect(readLayout(layoutText(profile))).toEqual({ profile });
  });

  it("refuse what is not a layout", () => {
    expect(readLayout("hello")).toEqual({ error: "not-a-layout" });
    expect(readLayout(JSON.stringify({ kind: "other", version: 1 }))).toEqual({
      error: "not-a-layout",
    });
    const broken = {
      kind: LAYOUT_KIND,
      version: 1,
      profile: { from: "xc", copy: 1, pages: [] },
    };
    expect(readLayout(JSON.stringify(broken))).toEqual({ error: "not-a-layout" });
  });

  it("refuse a layout of a later app", () => {
    const later = {
      kind: LAYOUT_KIND,
      version: LAYOUT_VERSION + 1,
      profile: profileOf("xc"),
    };
    expect(readLayout(JSON.stringify(later))).toEqual({ error: "newer" });
  });
});
