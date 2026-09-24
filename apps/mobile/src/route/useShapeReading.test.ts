import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useShapeReading } from "./useShapeReading";

const API = "http://pc:8000";
const fetchSpy = jest.spyOn(globalThis, "fetch");

afterEach(() => {
  fetchSpy.mockReset();
});

afterAll(() => {
  fetchSpy.mockRestore();
});

test("words not asked yet are unread", async () => {
  const { result: hook } = await renderHook(() => useShapeReading(API));
  expect(hook.current.stateOf("Nemo")).toEqual({ status: "unread" });
  expect(fetchSpy).not.toHaveBeenCalled();
});

test("reads the words, then remembers them whatever the case and spaces", async () => {
  fetchSpy.mockResolvedValue(Response.json({ text: "Nemo", shape: "fish" }));
  const { result: hook } = await renderHook(() => useShapeReading(API));
  await act(() => hook.current.read(" Nemo "));
  await waitFor(() =>
    expect(hook.current.stateOf("Nemo")).toEqual({ status: "read", shape: "fish" }),
  );
  expect(JSON.parse(String(fetchSpy.mock.calls[0][1]?.body))).toEqual({
    text: "Nemo",
  });

  await act(() => hook.current.read("NEMO"));
  expect(hook.current.stateOf("  nemo")).toEqual({ status: "read", shape: "fish" });
  expect(fetchSpy).toHaveBeenCalledTimes(1);
});

test("is reading while the API has not answered, and asks only once", async () => {
  fetchSpy.mockReturnValue(new Promise(() => {}));
  const { result: hook } = await renderHook(() => useShapeReading(API));
  await act(() => hook.current.read("Garfield"));
  expect(hook.current.stateOf("Garfield")).toEqual({ status: "reading" });
  await act(() => hook.current.read("Garfield"));
  expect(fetchSpy).toHaveBeenCalledTimes(1);
});

test("a failure is not remembered: reading again asks again", async () => {
  fetchSpy
    .mockResolvedValueOnce(
      Response.json(
        { error: { code: "ai_unavailable", message: "off" } },
        { status: 503 },
      ),
    )
    .mockResolvedValueOnce(Response.json({ text: "Garfield", shape: "cat" }));
  const { result: hook } = await renderHook(() => useShapeReading(API));
  await act(() => hook.current.read("Garfield"));
  await waitFor(() =>
    expect(hook.current.stateOf("Garfield")).toEqual({
      status: "failed",
      problem: { kind: "api_error", code: "ai_unavailable", message: "off" },
    }),
  );

  await act(() => hook.current.read("Garfield"));
  await waitFor(() =>
    expect(hook.current.stateOf("Garfield")).toEqual({ status: "read", shape: "cat" }),
  );
  expect(fetchSpy).toHaveBeenCalledTimes(2);
});

test("without an API address it fails without asking anyone", async () => {
  const { result: hook } = await renderHook(() => useShapeReading(null));
  await act(() => hook.current.read("Nemo"));
  expect(hook.current.stateOf("Nemo")).toEqual({
    status: "failed",
    problem: { kind: "no_api_url" },
  });
  expect(fetchSpy).not.toHaveBeenCalled();
});

test("empty words are never sent", async () => {
  const { result: hook } = await renderHook(() => useShapeReading(API));
  await act(() => hook.current.read("   "));
  expect(fetchSpy).not.toHaveBeenCalled();
});
