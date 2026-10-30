import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";

import { useReduceMotion } from "./useReduceMotion";

afterEach(() => jest.restoreAllMocks());

test("motion is on until the phone says otherwise, then follows the setting", async () => {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
  let changed: ((on: boolean) => void) | null = null;
  jest.spyOn(AccessibilityInfo, "addEventListener").mockImplementation(((
    event: string,
    handler: (on: boolean) => void,
  ) => {
    if (event === "reduceMotionChanged") {
      changed = handler;
    }
    return { remove: jest.fn() };
  }) as unknown as typeof AccessibilityInfo.addEventListener);

  const { result } = await renderHook(() => useReduceMotion());
  await waitFor(() => expect(result.current).toBe(true));

  // The setting turned off while the app is open.
  expect(changed).not.toBeNull();
  await act(async () => {
    changed?.(false);
  });
  expect(result.current).toBe(false);
});

test("a phone that cannot say keeps motion on", async () => {
  jest
    .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
    .mockRejectedValue(new Error("no accessibility bridge"));
  const { result } = await renderHook(() => useReduceMotion());
  await act(async () => {});
  expect(result.current).toBe(false);
});
