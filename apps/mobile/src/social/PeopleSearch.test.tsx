import people from "@shaperoute/shared-types/fixtures/people.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { NO_API, SESSION_ENDED } from "../account/messages";
import { answers, apiError } from "../account/testing";
import type { AccountState } from "../account/useAccount";
import { PeopleSearch, SEARCH_DELAY_MS } from "./PeopleSearch";

const URL = "http://api";
const signedIn: AccountState = { status: "signedIn", session: session as Session };
const [ada, adam] = people.people;

async function show(
  fetchFn: jest.Mock,
  {
    state = signedIn,
    apiUrl = URL,
    onPick = jest.fn(),
  }: { state?: AccountState; apiUrl?: string | null; onPick?: jest.Mock } = {},
) {
  const sessionEnded = jest.fn();
  await render(
    <PeopleSearch
      apiUrl={apiUrl}
      account={{ state, sessionEnded }}
      onPick={onPick}
      fetchFn={fetchFn}
      apiKey={null}
    />,
  );
  return sessionEnded;
}

async function type(text: string) {
  await fireEvent.changeText(screen.getByPlaceholderText("Name"), text);
}

async function pause(ms = SEARCH_DELAY_MS) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

test("the members found show with their picture and name, and one opens", async () => {
  const fetchFn = answers({ status: 200, body: people });
  const onPick = jest.fn();
  await show(fetchFn, { onPick });
  expect(screen.getByText("Type at least 2 letters of a name.")).toBeOnTheScreen();
  await type("ada");
  await pause();
  expect(screen.getByText("Ada_runs")).toBeOnTheScreen();
  expect(screen.getByText("adam.trento")).toBeOnTheScreen();
  // Ada's picture; Adam has none: his initial.
  expect(screen.getByTestId("avatar-photo")).toHaveProp("source", {
    uri: `data:image/jpeg;base64,${ada.photo}`,
  });
  expect(screen.getByText("A")).toBeOnTheScreen();
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(`${URL}/users?q=ada`);
  expect(init).toMatchObject({
    method: "GET",
    headers: { Authorization: `Bearer ${session.token}` },
  });
  await fireEvent.press(screen.getByRole("button", { name: "adam.trento" }));
  expect(onPick).toHaveBeenCalledWith(adam);
});

test("one request once the typing pauses, none for one letter", async () => {
  const fetchFn = answers({ status: 200, body: people });
  await show(fetchFn);
  await type("a");
  await pause();
  expect(fetchFn).not.toHaveBeenCalled();
  await type("ad");
  await pause(SEARCH_DELAY_MS - 100);
  await type("ada");
  await pause(SEARCH_DELAY_MS - 100);
  expect(fetchFn).not.toHaveBeenCalled();
  await pause(100);
  expect(fetchFn).toHaveBeenCalledTimes(1);
  expect(fetchFn.mock.calls[0][0]).toBe(`${URL}/users?q=ada`);
  // Back to one letter: what was found goes.
  await type("a");
  expect(screen.queryByText("Ada_runs")).toBeNull();
  expect(screen.getByText("Type at least 2 letters of a name.")).toBeOnTheScreen();
});

test("the return key searches at once, and the pause does not ask again", async () => {
  const fetchFn = answers({ status: 200, body: people });
  await show(fetchFn);
  await type("ada ");
  await fireEvent(screen.getByPlaceholderText("Name"), "submitEditing");
  await pause();
  expect(fetchFn).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Ada_runs")).toBeOnTheScreen();
});

test("an answer to an older name is not shown", async () => {
  let answerOld: (response: Response) => void = () => {};
  const fetchFn = jest
    .fn()
    .mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        answerOld = resolve;
      }),
    )
    .mockResolvedValueOnce(Response.json({ people: [] }));
  await show(fetchFn);
  await type("ada");
  await pause();
  await type("zzz");
  await pause();
  expect(screen.getByText("Nobody has a name like that.")).toBeOnTheScreen();
  await act(async () => {
    answerOld(Response.json(people));
  });
  expect(screen.queryByText("Ada_runs")).toBeNull();
  expect(screen.getByText("Nobody has a name like that.")).toBeOnTheScreen();
});

test("a server without the search says so", async () => {
  const fetchFn = answers({ status: 404, body: apiError("http_error", "Not Found") });
  await show(fetchFn);
  await type("ada");
  await pause();
  expect(
    screen.getByText("This server cannot look for members yet."),
  ).toBeOnTheScreen();
});

test("a session that ended asks to log in again", async () => {
  const fetchFn = answers({ status: 401, body: apiError("session_expired") });
  const sessionEnded = await show(fetchFn);
  await type("ada");
  await pause();
  expect(screen.getByText(SESSION_ENDED)).toBeOnTheScreen();
  expect(sessionEnded).toHaveBeenCalledWith(session.token);
});

test("without an account, or without the API, nothing is asked", async () => {
  const fetchFn = jest.fn();
  await show(fetchFn, { state: { status: "signedOut", notice: null } });
  expect(screen.getByText("Log in to find your friends.")).toBeOnTheScreen();
  expect(screen.queryByPlaceholderText("Name")).toBeNull();
  await show(fetchFn, { apiUrl: null });
  expect(screen.getByText(NO_API)).toBeOnTheScreen();
  expect(fetchFn).not.toHaveBeenCalled();
});
