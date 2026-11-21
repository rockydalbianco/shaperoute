/** The live becomes the post (TASK-468 part B2b2): asked once, tied once,
 * only after «Post» and for a post others see. */
import { Alert, type AlertButton } from "react-native";

import {
  askToPost,
  rememberPlannedLive,
  resetPlannedPost,
  takePlannedRun,
  tiePlannedPost,
} from "./plannedPost";

const RUN = {
  plannedLiveId: "p1",
  title: "Milano Marathon",
  audience: "everyone" as const,
};

function api() {
  const fetchFn = jest.fn(
    async (_url: string, _init?: RequestInit) => new Response(null, { status: 204 }),
  );
  return {
    fetchFn,
    options: {
      baseUrl: "http://api",
      token: "t",
      fetchFn: fetchFn as unknown as typeof fetch,
      key: null,
    },
  };
}

function asked(): AlertButton[] {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  askToPost(RUN, jest.fn());
  const [title, message, buttons] = alert.mock.calls[0];
  expect(title).toBe("Post it in the Feed?");
  expect(message).toBe("Your live becomes the post of this activity.");
  return buttons as AlertButton[];
}

beforeEach(resetPlannedPost);
afterEach(() => jest.restoreAllMocks());

test("the planned live of the run is taken once", () => {
  expect(takePlannedRun()).toBeNull();
  rememberPlannedLive(RUN);
  expect(takePlannedRun()).toEqual(RUN);
  expect(takePlannedRun()).toBeNull();
});

test("«Post», then the next post others see is tied to the live, once", async () => {
  const buttons = asked();
  expect(buttons.map((b) => b.text)).toEqual(["Don't post", "Post"]);
  buttons[1].onPress?.();
  const { fetchFn, options } = api();
  await tiePlannedPost(options, "d1", true);
  expect(fetchFn).toHaveBeenCalledTimes(1);
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe("http://api/me/planned-lives/p1/post");
  expect(init?.method).toBe("PUT");
  expect(JSON.parse(String(init?.body))).toEqual({ drawing_id: "d1" });
  await tiePlannedPost(options, "d2", true);
  expect(fetchFn).toHaveBeenCalledTimes(1);
});

test("«Don't post», or a post only its owner sees, ties nothing", async () => {
  asked()[0].onPress?.();
  const { fetchFn, options } = api();
  await tiePlannedPost(options, "d1", true);
  jest.restoreAllMocks();
  asked()[1].onPress?.();
  await tiePlannedPost(options, "d1", false);
  await tiePlannedPost(options, "d1", true);
  expect(fetchFn).not.toHaveBeenCalled();
});
