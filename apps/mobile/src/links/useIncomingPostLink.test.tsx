import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { act, renderHook } from "@testing-library/react-native";
import { Linking } from "react-native";

import type { AccountState } from "../account/useAccount";
import {
  SAME_LINK_MS,
  forgetPostLinkIn,
  useIncomingPostLink,
} from "./useIncomingPostLink";

const ID = "0b7e5a94-6c1d-4f38-8e2a-9d4c1f6b3a57";
const OTHER = "22222222-2222-4222-8222-222222222222";
const linkOf = (id: string) => `https://getmuw.app/p/#${id}`;

const IN: AccountState = { status: "signedIn", session: session as Session };
const OUT: AccountState = { status: "signedOut", notice: null };

type UrlListener = (event: { url: string }) => void;
let listeners: UrlListener[] = [];
let opened: string | null = null;
let now = 1_000_000;
const openDrawing = jest.fn();

/** The phone hands `url` to the app while it is open. */
async function arrives(url: string): Promise<void> {
  await act(async () => {
    listeners.forEach((listener) => listener({ url }));
  });
}

function mount(state: AccountState) {
  return renderHook(
    ({ account }: { account: { state: AccountState } }) =>
      useIncomingPostLink(account, openDrawing),
    { initialProps: { account: { state } } },
  );
}

beforeEach(() => {
  forgetPostLinkIn();
  listeners = [];
  opened = null;
  now = 1_000_000;
  openDrawing.mockReset();
  jest.spyOn(Date, "now").mockImplementation(() => now);
  jest.spyOn(Linking, "getInitialURL").mockImplementation(async () => opened);
  jest.spyOn(Linking, "addEventListener").mockImplementation(((
    _type: string,
    listener: UrlListener,
  ) => {
    listeners.push(listener);
    return {
      remove: () => {
        listeners = listeners.filter((one) => one !== listener);
      },
    };
  }) as unknown as typeof Linking.addEventListener);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("useIncomingPostLink", () => {
  it("opens the post of a link that arrives while the app is open", async () => {
    await mount(IN);
    await act(async () => {});
    expect(openDrawing).not.toHaveBeenCalled();

    await arrives(linkOf(ID));

    expect(openDrawing).toHaveBeenCalledTimes(1);
    expect(openDrawing).toHaveBeenCalledWith(ID);
  });

  it("opens the post of the link the app was opened with", async () => {
    opened = linkOf(ID);
    await mount(IN);
    await act(async () => {});

    expect(openDrawing).toHaveBeenCalledTimes(1);
    expect(openDrawing).toHaveBeenCalledWith(ID);
  });

  it("opens once the link the phone hands both ways", async () => {
    opened = linkOf(ID);
    await mount(IN);
    await act(async () => {});
    await arrives(linkOf(ID));

    expect(openDrawing).toHaveBeenCalledTimes(1);
  });

  it("opens the same post again when its link is opened again later", async () => {
    await mount(IN);
    await arrives(linkOf(ID));
    now += SAME_LINK_MS;
    await arrives(linkOf(ID));

    expect(openDrawing).toHaveBeenCalledTimes(2);
  });

  it("opens another post right after the first", async () => {
    await mount(IN);
    await arrives(linkOf(ID));
    await arrives(linkOf(OTHER));

    expect(openDrawing.mock.calls).toEqual([[ID], [OTHER]]);
  });

  it("leaves alone an address that is not the link of a post", async () => {
    opened = "exp://192.168.1.10:8081";
    await mount(IN);
    await act(async () => {});
    await arrives("https://getmuw.app/live/#abc");
    await arrives(`https://example.com/p/#${ID}`);

    expect(openDrawing).not.toHaveBeenCalled();
  });

  it("waits for the account, then opens the post", async () => {
    opened = linkOf(ID);
    const hook = await mount(OUT);
    await act(async () => {});
    expect(openDrawing).not.toHaveBeenCalled();

    await hook.rerender({ account: { state: IN } });

    expect(openDrawing).toHaveBeenCalledTimes(1);
    expect(openDrawing).toHaveBeenCalledWith(ID);
  });

  it("keeps the last link that arrived without an account", async () => {
    const hook = await mount(OUT);
    await arrives(linkOf(ID));
    await arrives(linkOf(OTHER));

    await hook.rerender({ account: { state: IN } });

    expect(openDrawing.mock.calls).toEqual([[OTHER]]);
  });

  it("does not open again the link the app was opened with when mounted again", async () => {
    opened = linkOf(ID);
    const hook = await mount(IN);
    await act(async () => {});
    await hook.unmount();
    now += SAME_LINK_MS * 10;

    await mount(IN);
    await act(async () => {});

    expect(openDrawing).toHaveBeenCalledTimes(1);
  });

  it("stops listening when it leaves", async () => {
    const hook = await mount(IN);
    await act(async () => {});
    await hook.unmount();

    expect(listeners).toHaveLength(0);
  });

  it("opens through the latest door", async () => {
    const later = jest.fn();
    const hook = await renderHook(
      ({ door }: { door: (id: string) => void }) =>
        useIncomingPostLink({ state: IN }, door),
      { initialProps: { door: openDrawing } },
    );
    await hook.rerender({ door: later });
    await arrives(linkOf(ID));

    expect(openDrawing).not.toHaveBeenCalled();
    expect(later).toHaveBeenCalledWith(ID);
  });
});
