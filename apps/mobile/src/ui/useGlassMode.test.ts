import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";

import { glassModeOf, useGlassMode } from "./useGlassMode";

// The glass follows «Reduce Transparency» and «Increase Contrast» (TASK-469,
// ADR-0383).

type Handler = (on: boolean) => void;

function phone({ clear = false, darker = false, highText = false } = {}) {
  jest.spyOn(AccessibilityInfo, "isReduceTransparencyEnabled").mockResolvedValue(clear);
  jest
    .spyOn(AccessibilityInfo, "isDarkerSystemColorsEnabled")
    .mockResolvedValue(darker);
  jest
    .spyOn(AccessibilityInfo, "isHighTextContrastEnabled")
    .mockResolvedValue(highText);
  const handlers = new Map<string, Handler>();
  const remove = jest.fn();
  jest.spyOn(AccessibilityInfo, "addEventListener").mockImplementation(((
    event: string,
    handler: Handler,
  ) => {
    handlers.set(event, handler);
    return { remove };
  }) as unknown as typeof AccessibilityInfo.addEventListener);
  return { handlers, remove };
}

afterEach(() => jest.restoreAllMocks());

test("contrast wins over transparency", () => {
  expect(glassModeOf(false, false)).toBe("glass");
  expect(glassModeOf(true, false)).toBe("solid");
  expect(glassModeOf(false, true)).toBe("contrast");
  expect(glassModeOf(true, true)).toBe("contrast");
});

test("«Reduce Transparency» makes the glass solid, and turning it off brings it back", async () => {
  const { handlers } = phone({ clear: true });
  const { result } = await renderHook(() => useGlassMode());
  await waitFor(() => expect(result.current).toBe("solid"));
  await act(async () => {
    handlers.get("reduceTransparencyChanged")?.(false);
  });
  expect(result.current).toBe("glass");
});

test("«Increase Contrast» on iOS gives the contrast glass", async () => {
  phone({ darker: true });
  const { result } = await renderHook(() => useGlassMode());
  await waitFor(() => expect(result.current).toBe("contrast"));
});

test("«High contrast text» on Android gives the contrast glass too", async () => {
  const { handlers } = phone();
  const { result } = await renderHook(() => useGlassMode());
  await act(async () => {});
  expect(result.current).toBe("glass");
  await act(async () => {
    handlers.get("highTextContrastChanged")?.(true);
  });
  expect(result.current).toBe("contrast");
});

test("a phone that cannot say keeps the glass, and the listeners go with the screen", async () => {
  const { remove } = phone();
  jest
    .spyOn(AccessibilityInfo, "isReduceTransparencyEnabled")
    .mockRejectedValue(new Error("no accessibility bridge"));
  const { result, unmount } = await renderHook(() => useGlassMode());
  await act(async () => {});
  expect(result.current).toBe("glass");
  await act(async () => unmount());
  expect(remove).toHaveBeenCalledTimes(3);
});
