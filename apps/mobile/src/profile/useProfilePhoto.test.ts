import photo from "@shaperoute/shared-types/fixtures/profile-photo.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { answers, apiError, held } from "../account/testing";
import type { Account } from "../account/useAccount";
import { NO_API } from "../account/messages";
import { photoUri } from "../api/profilePhoto";
import type { PickedPhoto } from "./pickPhoto";
import { photoProblem, useProfilePhotoOf } from "./useProfilePhoto";

const URL = "http://api";
const URI = photoUri(photo);
const NEW = { image: "bmV3", updated_at: "2026-10-02T17:00:00Z" };

function account(token: string | null): Account {
  return {
    state:
      token === null
        ? { status: "signedOut", notice: null }
        : { status: "signedIn", session: { ...(session as Session), token } },
    busy: null,
    problem: null,
    signUp: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    deleteAccount: jest.fn(),
    editProfile: jest.fn(),
    changeEmail: jest.fn(),
    changePhone: jest.fn(),
    changeNotifications: jest.fn(),
    clearProblem: jest.fn(),
    sessionEnded: ended,
  };
}

const ended = jest.fn();

type Props = { token: string | null; baseUrl?: string | null };

async function hook(
  fetchFn: jest.Mock,
  pick: jest.Mock = jest.fn(),
  token: string | null = "one",
) {
  const rendered = await renderHook(
    ({ token, baseUrl = URL }: Props) =>
      useProfilePhotoOf(baseUrl, account(token), { fetchFn, key: null, pick }),
    { initialProps: { token } },
  );
  return { ...rendered, pick };
}

/** The phone's picker, handing back `picked`. */
function picker(picked: PickedPhoto) {
  return jest.fn(async () => picked);
}

beforeEach(() => ended.mockReset());

test("with nobody signed in there is no picture, and nothing is asked", async () => {
  const fetchFn = answers();
  const pick = picker({ kind: "picked", base64: "aGVsbG8=" });
  const { result } = await hook(fetchFn, pick, null);
  expect(result.current).toMatchObject({ uri: null, busy: null, problem: null });
  await act(async () => {
    result.current.choose("library");
    result.current.remove();
  });
  expect(fetchFn).not.toHaveBeenCalled();
  expect(pick).not.toHaveBeenCalled();
});

test("signed in, the picture is asked for at once and shows", async () => {
  const waiting = held();
  const { result } = await hook(waiting.fetchFn);
  expect(result.current.uri).toBeNull();
  expect(waiting.fetchFn.mock.calls[0][0]).toBe("http://api/me/photo");
  await act(async () => waiting.answer(200, photo));
  expect(result.current.uri).toBe(URI);
});

test("no picture, no API, or no answer: the letter stays, and nothing is said", async () => {
  for (const answer of [
    { status: 404, body: apiError("http_error") },
    new Error("offline"),
    { status: 500, body: apiError("engine_error") },
  ]) {
    const fetchFn = answers(answer);
    const { result } = await hook(fetchFn);
    await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(1));
    expect(result.current).toMatchObject({ uri: null, problem: null });
  }
  expect(ended).not.toHaveBeenCalled();
});

test("a session that ended signs out", async () => {
  const fetchFn = answers({ status: 401, body: apiError("session_expired") });
  await hook(fetchFn);
  await waitFor(() => expect(ended).toHaveBeenCalledWith("one"));
});

test("a picture chosen is sent, and shows as the API kept it", async () => {
  const saving = held();
  const pick = picker({ kind: "picked", base64: "aGVsbG8=" });
  const fetchFn = jest.fn(async (url: string, init?: RequestInit) =>
    init?.method === "PUT"
      ? saving.fetchFn(url, init)
      : Response.json(apiError("http_error"), { status: 404 }),
  );
  const { result } = await hook(fetchFn, pick);
  await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(1));
  await act(async () => result.current.choose("camera"));
  expect(pick).toHaveBeenCalledWith("camera");
  expect(result.current.busy).toBe("saving");
  const [, init] = fetchFn.mock.calls[1];
  expect(init).toMatchObject({ method: "PUT" });
  expect(JSON.parse(String(init?.body))).toEqual({ image: "aGVsbG8=" });
  // A second tap while it is on its way opens no picker.
  await act(async () => result.current.choose("library"));
  expect(pick).toHaveBeenCalledTimes(1);

  await act(async () => saving.answer(200, NEW));
  expect(result.current).toMatchObject({
    uri: photoUri(NEW),
    busy: null,
    problem: null,
  });
});

test("while the picker is open, it is busy; cancelled, nothing changes or is said", async () => {
  let hand: (picked: PickedPhoto) => void = () => {};
  const pick = jest.fn(
    () =>
      new Promise<PickedPhoto>((resolve) => {
        hand = resolve;
      }),
  );
  const fetchFn = answers({ status: 200, body: photo });
  const { result } = await hook(fetchFn, pick);
  await waitFor(() => expect(result.current.uri).toBe(URI));
  await act(async () => result.current.choose("library"));
  expect(result.current.busy).toBe("picking");
  await act(async () => hand({ kind: "cancelled" }));
  expect(result.current).toMatchObject({ uri: URI, busy: null, problem: null });
  expect(fetchFn).toHaveBeenCalledTimes(1);
});

test("a picture that cannot be picked says why", async () => {
  const cases: [PickedPhoto, RegExp][] = [
    [{ kind: "denied" }, /^The camera is off for this app/],
    [{ kind: "too_large" }, /too large/],
    [{ kind: "pick_failed" }, /Could not open the picture/],
  ];
  for (const [picked, said] of cases) {
    const { result } = await hook(answers({ status: 404 }), picker(picked));
    await act(async () => result.current.choose("camera"));
    expect(result.current.problem).toMatch(said);
    expect(result.current.busy).toBeNull();
  }
});

test("a picture the API refuses is said, and the one before stays", async () => {
  const fetchFn = answers(
    { status: 200, body: photo },
    { status: 422, body: apiError("invalid_request", "image: cannot read") },
  );
  const pick = picker({ kind: "picked", base64: "aGVsbG8=" });
  const { result } = await hook(fetchFn, pick);
  await waitFor(() => expect(result.current.uri).toBe(URI));
  await act(async () => result.current.choose("library"));
  expect(result.current).toMatchObject({
    uri: URI,
    busy: null,
    problem: "This picture cannot be used. Choose another one.",
  });
  await act(async () => result.current.clearProblem());
  expect(result.current.problem).toBeNull();
});

test("the session ending while saving signs out", async () => {
  const fetchFn = answers(
    { status: 404 },
    { status: 401, body: apiError("not_signed_in") },
  );
  const { result } = await hook(fetchFn, picker({ kind: "picked", base64: "aGk=" }));
  await act(async () => result.current.choose("library"));
  expect(ended).toHaveBeenCalledWith("one");
});

test("removing waits for the API's yes", async () => {
  const removing = held();
  const fetchFn = jest.fn(async (url: string, init?: RequestInit) =>
    init?.method === "DELETE" ? removing.fetchFn(url, init) : Response.json(photo),
  );
  const { result } = await hook(fetchFn);
  await waitFor(() => expect(result.current.uri).toBe(URI));
  await act(async () => result.current.remove());
  expect(result.current).toMatchObject({ uri: URI, busy: "removing" });
  await act(async () => removing.answer(204));
  expect(result.current).toMatchObject({ uri: null, busy: null });
  // Nothing left to remove: nothing is asked.
  await act(async () => result.current.remove());
  expect(fetchFn).toHaveBeenCalledTimes(2);
});

test("removing refused keeps the picture and says why", async () => {
  const fetchFn = answers({ status: 200, body: photo }, new Error("offline"));
  const { result } = await hook(fetchFn);
  await waitFor(() => expect(result.current.uri).toBe(URI));
  await act(async () => result.current.remove());
  expect(result.current.uri).toBe(URI);
  expect(result.current.problem).toMatch(/^No connection/);
});

test("without the API's address, choosing says so and opens nothing", async () => {
  const pick = picker({ kind: "picked", base64: "aGk=" });
  const fetchFn: jest.Mock = answers();
  const rendered = await renderHook(() =>
    useProfilePhotoOf(null, account("one"), { fetchFn, key: null, pick }),
  );
  await act(async () => rendered.result.current.choose("library"));
  expect(rendered.result.current.problem).toBe(NO_API);
  expect(pick).not.toHaveBeenCalled();
  expect(fetchFn).not.toHaveBeenCalled();
});

test("another account does not see the picture of the one before", async () => {
  const fetchFn = jest.fn(async (_url: string, init?: RequestInit) => {
    const token = (init?.headers as Record<string, string>).Authorization;
    return token === "Bearer one"
      ? Response.json(photo)
      : Response.json(apiError("http_error"), { status: 404 });
  });
  const { result, rerender } = await hook(fetchFn);
  await waitFor(() => expect(result.current.uri).toBe(URI));
  await rerender({ token: null });
  expect(result.current.uri).toBeNull();
  await rerender({ token: "two" });
  await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(2));
  expect(result.current.uri).toBeNull();
});

test("an API from before the pictures, when saving, says so in words", () => {
  expect(
    photoProblem({
      kind: "api_error",
      code: "http_error",
      message: "Not Found",
      suggested_distance_m: null,
      retryAfterS: null,
    }),
  ).toBe("Profile pictures are not available on this API yet.");
});
