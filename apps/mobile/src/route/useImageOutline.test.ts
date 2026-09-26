import imageError from "@shaperoute/shared-types/fixtures/image-error.json";
import imageOutline from "@shaperoute/shared-types/fixtures/image-outline.json";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import type { Picked } from "./pickImage";
import { useImageOutline } from "./useImageOutline";

const PICTURE = { uri: "file:///apple.jpg", width: 800, height: 600 };
const PICKED: Picked = { kind: "picked", picture: PICTURE, base64: "aGVsbG8=" };
const fetchSpy = jest.spyOn(globalThis, "fetch");

afterEach(() => fetchSpy.mockReset());
afterAll(() => fetchSpy.mockRestore());

test("the chosen picture is traced by the API, then shown with its outline", async () => {
  fetchSpy.mockResolvedValueOnce(Response.json(imageOutline));
  const pick = jest.fn(async () => PICKED);
  const { result } = await renderHook(() => useImageOutline("http://pc:8000", pick));
  await act(async () => result.current.choose("library"));
  await waitFor(() =>
    expect(result.current.state).toEqual({
      status: "traced",
      picture: PICTURE,
      outline: imageOutline,
    }),
  );
  expect(pick).toHaveBeenCalledWith("library");
  expect(fetchSpy.mock.calls[0][0]).toBe("http://pc:8000/image-outlines");
});

test("a refused picture keeps the picture and the reason", async () => {
  fetchSpy.mockResolvedValueOnce(Response.json(imageError, { status: 422 }));
  const { result } = await renderHook(() =>
    useImageOutline("http://pc:8000", async () => PICKED),
  );
  await act(async () => result.current.choose("camera"));
  await waitFor(() => expect(result.current.state.status).toBe("failed"));
  expect(result.current.state).toMatchObject({
    picture: PICTURE,
    problem: { kind: "api_error", code: "image_not_usable", reason: "background" },
  });
});

test("cancelling the picker keeps what was there", async () => {
  fetchSpy.mockResolvedValueOnce(Response.json(imageOutline));
  const picks: Picked[] = [PICKED, { kind: "cancelled" }];
  const { result } = await renderHook(() =>
    useImageOutline("http://pc:8000", async () => picks.shift()!),
  );
  await act(async () => result.current.choose("library"));
  await waitFor(() => expect(result.current.state.status).toBe("traced"));
  await act(async () => result.current.choose("library"));
  expect(result.current.state.status).toBe("traced");
  expect(fetchSpy).toHaveBeenCalledTimes(1);
});

test("a camera refused, or no API, fails without asking the API", async () => {
  const { result } = await renderHook(() =>
    useImageOutline("http://pc:8000", async () => ({ kind: "denied" })),
  );
  await act(async () => result.current.choose("camera"));
  await waitFor(() =>
    expect(result.current.state).toEqual({
      status: "failed",
      picture: null,
      problem: { kind: "denied" },
    }),
  );
  const { result: noApi } = await renderHook(() =>
    useImageOutline(null, async () => PICKED),
  );
  await act(async () => noApi.current.choose("library"));
  await waitFor(() =>
    expect(noApi.current.state).toEqual({
      status: "failed",
      picture: PICTURE,
      problem: { kind: "no_api_url" },
    }),
  );
  expect(fetchSpy).not.toHaveBeenCalled();
});
