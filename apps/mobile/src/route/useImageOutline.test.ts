import imageError from "@shaperoute/shared-types/fixtures/image-error.json";
import imageOutline from "@shaperoute/shared-types/fixtures/image-outline.json";
import edited from "@shaperoute/shared-types/fixtures/image-outline-edited.json";
import editError from "@shaperoute/shared-types/fixtures/outline-edit-error.json";
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

// TASK-079: lines drawn on the outline, and Undo.
async function traced() {
  fetchSpy.mockResolvedValueOnce(Response.json(imageOutline));
  const hook = await renderHook(() =>
    useImageOutline("http://pc:8000", async () => PICKED),
  );
  await act(async () => hook.result.current.choose("library"));
  await waitFor(() => expect(hook.result.current.state.status).toBe("traced"));
  return hook;
}

const LINE: [number, number][] = [
  [0.5, 0.88],
  [0.5, 0.5],
];

test("a line drawn becomes the outline shown, and Undo goes back", async () => {
  const { result } = await traced();
  expect(result.current.edits).toEqual({ earlier: [], edit: { status: "idle" } });
  fetchSpy.mockResolvedValueOnce(Response.json(edited));
  await act(async () => result.current.add("detail", LINE));
  await waitFor(() =>
    expect(result.current.state).toMatchObject({ status: "traced", outline: edited }),
  );
  expect(result.current.edits).toEqual({
    earlier: [imageOutline],
    edit: { status: "idle" },
  });
  const [url, init] = fetchSpy.mock.calls[1];
  expect(url).toBe("http://pc:8000/image-outline-edits");
  expect(JSON.parse(init?.body as string)).toMatchObject({
    kind: "detail",
    line: LINE,
  });
  await act(async () => result.current.undo());
  expect(result.current.state).toMatchObject({ outline: imageOutline });
  expect(result.current.edits.earlier).toEqual([]);
});

test("a refused line keeps the outline and says why", async () => {
  const { result } = await traced();
  fetchSpy.mockResolvedValueOnce(Response.json(editError, { status: 422 }));
  await act(async () => result.current.add("detail", LINE));
  await waitFor(() => expect(result.current.edits.edit.status).toBe("refused"));
  expect(result.current.edits.edit).toMatchObject({
    kind: "detail",
    problem: {
      kind: "api_error",
      code: "outline_edit_rejected",
      reason: "not_on_line",
    },
  });
  expect(result.current.state).toMatchObject({ outline: imageOutline });
  // Undo has nothing to take away.
  await act(async () => result.current.undo());
  expect(result.current.state).toMatchObject({ outline: imageOutline });
});

test("a new picture starts from its own outline, without the edits", async () => {
  const { result } = await traced();
  fetchSpy.mockResolvedValueOnce(Response.json(edited));
  await act(async () => result.current.add("detail", LINE));
  await waitFor(() => expect(result.current.edits.earlier).toHaveLength(1));
  fetchSpy.mockResolvedValueOnce(Response.json(imageOutline));
  await act(async () => result.current.choose("library"));
  await waitFor(() =>
    expect(result.current.state).toMatchObject({ outline: imageOutline }),
  );
  expect(result.current.edits.earlier).toEqual([]);
});

test("Undo drops a line still on its way", async () => {
  const { result } = await traced();
  fetchSpy.mockResolvedValueOnce(Response.json(edited));
  await act(async () => result.current.add("detail", LINE));
  await waitFor(() => expect(result.current.edits.earlier).toHaveLength(1));
  let answer: (response: Response) => void = () => {};
  fetchSpy.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
  await act(async () => result.current.add("part", LINE));
  expect(result.current.edits.edit).toEqual({ status: "sending", kind: "part" });
  await act(async () => result.current.undo());
  expect(result.current.state).toMatchObject({ outline: imageOutline });
  await act(async () => answer(Response.json(edited)));
  expect(result.current.state).toMatchObject({ outline: imageOutline });
  expect(result.current.edits).toEqual({ earlier: [], edit: { status: "idle" } });
});
