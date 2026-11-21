/**
 * «Share live» on the recording screen (TASK-424 part B1): only with an
 * account; the sheet that says what is shown, heart rate included; the
 * phone's share sheet once ours has gone; «Sharing live», and the stop
 * after a question. Never on by itself.
 */
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Alert, type AlertButton, Platform, Share } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { answers } from "../account/testing";
import type { AccountState } from "../account/useAccount";
import { saveLanguageChoice } from "../i18n/language";
import { FollowsContext } from "../social/followsDoor";
import { LiveShareButton, liveShareMessage } from "./LiveShareButton";
import { liveShareStatus, resetLiveShare, startLiveShare } from "./liveShareStore";

// What the Modal was told to call when it has gone: the test says when.
const mockGone: { current: (() => void) | undefined } = { current: undefined };

jest.mock("react-native/Libraries/Modal/Modal", () => ({
  __esModule: true,
  default: ({
    visible,
    onDismiss,
    children,
  }: {
    visible?: boolean;
    onDismiss?: () => void;
    children?: unknown;
  }) => {
    mockGone.current = onDismiss;
    return visible === true ? children : null;
  },
}));

const API = "http://api";
const SIGNED_IN: AccountState = { status: "signedIn", session: session as Session };
const SIGNED_OUT: AccountState = { status: "signedOut", notice: null };
const URL = "https://getmuw.app/live/#AbCdEfGhIjKlMnOpQrStUv";
const CREATED = {
  status: 201,
  body: { id: "s1", url: URL, expires_at: "2026-11-10T07:00:00Z" },
};
const LIVE = {
  status: 200,
  body: { id: "s1", status: "live", expires_at: "2026-11-10T07:00:00Z" },
};
const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

async function show(
  state: AccountState,
  fetchFn: ReturnType<typeof answers> = answers(),
  canStart = true,
): Promise<void> {
  await render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <FollowsContext.Provider
        value={{
          apiUrl: API,
          account: { state, sessionEnded: () => {} },
          openProfile: () => {},
        }}
      >
        <LiveShareButton
          canStart={canStart}
          fetchFn={fetchFn as unknown as typeof fetch}
          apiKey={null}
        />
      </FollowsContext.Provider>
    </SafeAreaProvider>,
  );
}

/** The sheet's spring has played to its end. */
async function sheetDown(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
  });
}

const realOS = Platform.OS;

beforeEach(() => {
  resetLiveShare();
  Platform.OS = "ios";
});

afterEach(() => {
  resetLiveShare();
  Platform.OS = realOS;
  saveLanguageChoice("phone");
  jest.restoreAllMocks();
});

test("without an account: «Sign in to share live», with nothing to touch", async () => {
  await show(SIGNED_OUT);
  expect(screen.getByText("Sign in to share live")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Share live" })).toBeNull();
});

test("the first touch opens the sheet that names the heart rate; nothing is sent yet", async () => {
  const fetchFn = answers();
  await show(SIGNED_IN, fetchFn);
  await fireEvent.press(screen.getByRole("button", { name: "Share live" }));
  expect(screen.getByRole("header", { name: "Share this activity live" })).toBeTruthy();
  expect(screen.getByText(/your heart rate when a watch sends it/)).toBeTruthy();
  expect(
    screen.getByText(/The link stops working one hour after you finish/),
  ).toBeTruthy();
  expect(fetchFn).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("button", { name: "Not now" }));
  await sheetDown();
  expect(screen.queryByText("Share this activity live")).toBeNull();
  expect(fetchFn).not.toHaveBeenCalled();
  expect(liveShareStatus()).toEqual({ kind: "off" });
});

test("«Share link» makes the link, then the phone's sheet opens once ours has gone", async () => {
  const share = jest
    .spyOn(Share, "share")
    .mockResolvedValue({ action: "sharedAction" });
  const fetchFn = answers(CREATED, LIVE);
  await show(SIGNED_IN, fetchFn);
  await fireEvent.press(screen.getByRole("button", { name: "Share live" }));
  await fireEvent.press(screen.getByRole("button", { name: "Share link" }));
  expect(fetchFn.mock.calls[0][0]).toBe(`${API}/me/live-shares`);
  expect(fetchFn.mock.calls[0][1]?.headers).toMatchObject({
    Authorization: `Bearer ${SIGNED_IN.status === "signedIn" ? SIGNED_IN.session.token : ""}`,
  });
  // Not while our sheet is still closing: iOS would not show it.
  expect(share).not.toHaveBeenCalled();
  await act(async () => mockGone.current?.());
  expect(share).toHaveBeenCalledWith({
    message: `Follow my activity live on MuW: ${URL}`,
  });
  expect(share).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Sharing live" })).toBeTruthy();
});

test("on Android the phone's sheet opens as ours is down", async () => {
  Platform.OS = "android";
  const share = jest
    .spyOn(Share, "share")
    .mockResolvedValue({ action: "sharedAction" });
  await show(SIGNED_IN, answers(CREATED, LIVE));
  await fireEvent.press(screen.getByRole("button", { name: "Share live" }));
  await fireEvent.press(screen.getByRole("button", { name: "Share link" }));
  await sheetDown();
  expect(share).toHaveBeenCalledTimes(1);
});

test("a link that cannot be made says so in the sheet, and nothing is shared", async () => {
  const share = jest.spyOn(Share, "share");
  await show(SIGNED_IN, answers({ status: 503, body: {} }));
  await fireEvent.press(screen.getByRole("button", { name: "Share live" }));
  await fireEvent.press(screen.getByRole("button", { name: "Share link" }));
  expect(screen.getByText("Couldn't create the link. Try again.")).toBeTruthy();
  expect(screen.getByText("Share this activity live")).toBeTruthy();
  await act(async () => mockGone.current?.());
  expect(share).not.toHaveBeenCalled();
  expect(liveShareStatus()).toEqual({ kind: "off" });
});

test("«Sharing live» asks before it stops; «Stop sharing» sends the DELETE", async () => {
  jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" });
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  const fetchFn = answers(CREATED, LIVE, { status: 204 });
  await show(SIGNED_IN, fetchFn);
  await fireEvent.press(screen.getByRole("button", { name: "Share live" }));
  await fireEvent.press(screen.getByRole("button", { name: "Share link" }));
  await fireEvent.press(screen.getByRole("button", { name: "Sharing live" }));
  // TASK-468 part B1: a touch offers what else to do, «Stop sharing» last.
  expect(alert).toHaveBeenCalledTimes(1);
  const [menuTitle, , menu] = alert.mock.calls[0];
  expect(menuTitle).toBe("Sharing live");
  const offered = menu as AlertButton[];
  expect(offered.map((b) => b.text)).toEqual([
    "Send in MuW",
    "Live in the Feed",
    "Share link",
    "Stop sharing",
    "Keep sharing",
  ]);
  await act(async () => offered[3].onPress?.());
  expect(alert).toHaveBeenCalledTimes(2);
  const [title, message, buttons] = alert.mock.calls[1];
  expect(title).toBe("Stop sharing?");
  expect(message).toBe("The link stops working now.");
  const choices = buttons as AlertButton[];
  expect(choices.map((b) => b.text)).toEqual(["Keep sharing", "Stop sharing"]);
  // «Keep sharing» changes nothing.
  expect(choices[0].onPress).toBeUndefined();
  await act(async () => choices[1].onPress?.());
  expect(liveShareStatus()).toEqual({ kind: "off" });
  expect(screen.getByRole("button", { name: "Share live" })).toBeTruthy();
  const last = fetchFn.mock.calls[fetchFn.mock.calls.length - 1];
  expect(last[0]).toBe(`${API}/me/live-shares/s1`);
  expect(last[1]?.method).toBe("DELETE");
});

test("after the end of a route, no new link; one already on can still be stopped", async () => {
  await show(SIGNED_IN, answers(), false);
  expect(screen.queryByRole("button", { name: "Share live" })).toBeNull();
  expect(screen.queryByText("Sign in to share live")).toBeNull();
  screen.unmount();
  await startLiveShare(
    {
      baseUrl: API,
      token: "tok",
      fetchFn: answers(CREATED, LIVE) as unknown as typeof fetch,
    },
    "running",
  );
  await show(SIGNED_IN, answers(), false);
  expect(screen.getByRole("button", { name: "Sharing live" })).toBeTruthy();
});

test("the message follows the app's language", () => {
  saveLanguageChoice("it");
  expect(liveShareMessage(URL)).toBe(`Segui la mia attività dal vivo su MuW: ${URL}`);
});

// --- «Send in MuW» and the heart rate (TASK-468 part B1) ---

const ADA = {
  public_id: "8c1f7a52-3d4e-4b9a-9f61-2a7c0e5d9b13",
  username: "ada",
  photo: null,
};
const BOB = {
  public_id: "0a9b8c7d-6e5f-4a3b-9c2d-1e0f9a8b7c6d",
  username: "bob",
  photo: null,
};

/** A fetch that answers by path: the share, the lists, the send. */
function chatServer() {
  return jest.fn(async (url: string, _init?: RequestInit) => {
    const path = url.replace(API, "");
    if (path === "/me/live-shares") {
      return Response.json(
        { id: "s1", url: null, expires_at: "2026-11-10T07:00:00Z" },
        { status: 201 },
      );
    }
    if (path.endsWith("/updates")) {
      return Response.json(LIVE.body);
    }
    if (path.startsWith("/me/conversations")) {
      return Response.json({ conversations: [], next: null, total: 0 });
    }
    if (path.includes("followers")) {
      return Response.json({ people: [ADA, BOB], next: null, total: 2 });
    }
    if (path.endsWith("/send")) {
      return Response.json({ sent: [ADA.public_id], skipped: [] });
    }
    if (path.endsWith("/link")) {
      return Response.json(CREATED.body, { status: 201 });
    }
    return new Response(null, { status: 404 });
  });
}

test("«Send in MuW»: the share without its link, the heart as chosen, then the people", async () => {
  const share = jest
    .spyOn(Share, "share")
    .mockResolvedValue({ action: "sharedAction" });
  const fetchFn = chatServer();
  await show(SIGNED_IN, fetchFn as unknown as ReturnType<typeof answers>);
  await fireEvent.press(screen.getByRole("button", { name: "Share live" }));
  // Off unless turned on.
  const heart = screen.getByTestId("live-share-heart");
  expect(heart.props.value).toBe(false);
  await fireEvent(heart, "valueChange", true);
  await fireEvent.press(screen.getByRole("button", { name: "Send in MuW" }));
  const made = fetchFn.mock.calls.find(([url]) => url === `${API}/me/live-shares`);
  expect(JSON.parse(String(made?.[1]?.body))).toEqual({
    activity: "running",
    link: false,
    heart_visible: true,
  });
  expect(liveShareStatus()).toEqual({ kind: "sharing", id: "s1", url: null });
  // The people once the consent sheet is down; no share sheet: no link.
  await act(async () => mockGone.current?.());
  expect(share).not.toHaveBeenCalled();
  expect(await screen.findByText("Choose who gets your live")).toBeTruthy();
  const send = screen.getByTestId("send-live-send");
  expect(send.props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(await screen.findByRole("checkbox", { name: "ada" }));
  await fireEvent.press(screen.getByRole("button", { name: "Send (1)" }));
  const sent = fetchFn.mock.calls.find(([url]) => url.endsWith("/send"));
  expect(sent?.[0]).toBe(`${API}/me/live-shares/s1/send`);
  expect(JSON.parse(String(sent?.[1]?.body))).toEqual({ to: [ADA.public_id] });
  expect(screen.queryByText("Choose who gets your live")).toBeNull();
});

test("«Share link» while a chat-only share is on makes its link then", async () => {
  const share = jest
    .spyOn(Share, "share")
    .mockResolvedValue({ action: "sharedAction" });
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  const fetchFn = chatServer();
  await show(SIGNED_IN, fetchFn as unknown as ReturnType<typeof answers>);
  await fireEvent.press(screen.getByRole("button", { name: "Share live" }));
  await fireEvent.press(screen.getByRole("button", { name: "Send in MuW" }));
  await act(async () => mockGone.current?.());
  await fireEvent.press(screen.getByTestId("send-live-close"));
  await fireEvent.press(screen.getByRole("button", { name: "Sharing live" }));
  const menu = alert.mock.calls[0][2] as AlertButton[];
  await act(async () => menu[2].onPress?.());
  expect(
    fetchFn.mock.calls.some(([url]) => url === `${API}/me/live-shares/s1/link`),
  ).toBe(true);
  expect(share).toHaveBeenCalledWith({ message: liveShareMessage(URL) });
  expect(liveShareStatus()).toEqual({ kind: "sharing", id: "s1", url: URL });
});

// --- «Live in the Feed» and the stop of a share without a link (TASK-468 part B2a) ---

test("«Live in the Feed» asks who can follow, then makes the share for the Feed", async () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  const fetchFn = chatServer();
  await show(SIGNED_IN, fetchFn as unknown as ReturnType<typeof answers>);
  await fireEvent.press(screen.getByRole("button", { name: "Share live" }));
  await fireEvent.press(screen.getByRole("button", { name: "Live in the Feed" }));
  const [title, , buttons] = alert.mock.calls[0];
  expect(title).toBe("Who can follow");
  const choices = buttons as AlertButton[];
  expect(choices.map((b) => b.text)).toEqual(["Followers", "Everyone", "Not now"]);
  await act(async () => choices[1].onPress?.());
  const made = fetchFn.mock.calls.find(([url]) => url === `${API}/me/live-shares`);
  expect(JSON.parse(String(made?.[1]?.body))).toEqual({
    activity: "running",
    link: false,
    audience_feed: "everyone",
  });
  // No people sheet: the followers see it in the Feed.
  await act(async () => mockGone.current?.());
  expect(screen.queryByText("Choose who gets your live")).toBeNull();
});

test("while sharing, «Live in the Feed» changes who sees it; the stop of a share without a link", async () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  const fetchFn = chatServer();
  await show(SIGNED_IN, fetchFn as unknown as ReturnType<typeof answers>);
  await fireEvent.press(screen.getByRole("button", { name: "Share live" }));
  await fireEvent.press(screen.getByRole("button", { name: "Send in MuW" }));
  await act(async () => mockGone.current?.());
  await fireEvent.press(screen.getByTestId("send-live-close"));
  await fireEvent.press(screen.getByRole("button", { name: "Sharing live" }));
  const menu = alert.mock.calls[0][2] as AlertButton[];
  await act(async () => menu[1].onPress?.());
  const who = alert.mock.calls[1][2] as AlertButton[];
  await act(async () => who[0].onPress?.());
  const patched = fetchFn.mock.calls.find(([, init]) => init?.method === "PATCH");
  expect(patched?.[0]).toBe(`${API}/me/live-shares/s1`);
  expect(JSON.parse(String(patched?.[1]?.body))).toEqual({
    audience_feed: "followers",
  });
  // The user's choice 8: no link, so nobody can follow any more.
  await act(async () => menu[3].onPress?.());
  const [title, message] = alert.mock.calls[2];
  expect(title).toBe("Stop sharing?");
  expect(message).toBe("Nobody can follow you any more.");
});
