import { act, fireEvent, render, screen } from "@testing-library/react-native";

import response from "./fixtures/photon-via-belenzani-trento.json";
import { PlaceSearch, SUGGEST_DELAY_MS } from "./PlaceSearch";

const fetchMock = jest.spyOn(globalThis, "fetch");

function photonAnswers(body: unknown) {
  fetchMock.mockResolvedValue(Response.json(body));
}

async function searchFor(text: string) {
  await fireEvent.changeText(screen.getByPlaceholderText("City or street"), text);
  await fireEvent.press(screen.getByText("Search"));
}

beforeEach(() => {
  fetchMock.mockReset();
});

afterAll(() => {
  fetchMock.mockRestore();
});

test("an empty field sends no request", async () => {
  await render(<PlaceSearch onSelect={jest.fn()} />);
  await searchFor("   ");
  expect(fetchMock).not.toHaveBeenCalled();
});

test("shows the places found and gives back the one chosen", async () => {
  photonAnswers(response);
  const onSelect = jest.fn();
  await render(<PlaceSearch onSelect={onSelect} />);
  await searchFor("Via Belenzani, Trento");

  expect(await screen.findByText("Comune di Trento, Trento")).toBeOnTheScreen();
  expect(screen.getByText("© OpenStreetMap contributors")).toBeOnTheScreen();
  await fireEvent.press(screen.getByText("Via Rodolfo Belenzani, Trento"));

  expect(onSelect).toHaveBeenCalledWith({
    label: "Via Rodolfo Belenzani, Trento",
    point: [46.0692621, 11.1211947],
  });
  expect(screen.queryByText("Comune di Trento, Trento")).not.toBeOnTheScreen();
});

test("says so when nothing is found", async () => {
  photonAnswers({ type: "FeatureCollection", features: [] });
  await render(<PlaceSearch onSelect={jest.fn()} />);
  await searchFor("Xyzzy");
  expect(
    await screen.findByText("No place found. Try adding the city."),
  ).toBeOnTheScreen();
});

test("says so when the search fails", async () => {
  fetchMock.mockRejectedValue(new TypeError("Network request failed"));
  await render(<PlaceSearch onSelect={jest.fn()} />);
  await searchFor("Trento");
  expect(
    await screen.findByText("The search failed. Check the connection and try again."),
  ).toBeOnTheScreen();
});

// Suggestions while typing (TASK-085, ADR-0080).

async function type(text: string) {
  await fireEvent.changeText(screen.getByPlaceholderText("City or street"), text);
}

async function pause(ms = SUGGEST_DELAY_MS) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

describe("while typing", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("places are suggested once the typing pauses, one request", async () => {
    photonAnswers(response);
    await render(<PlaceSearch onSelect={jest.fn()} />);
    await type("Via");
    await pause(SUGGEST_DELAY_MS - 100);
    await type("Via Bel");
    await pause(SUGGEST_DELAY_MS - 100);
    expect(fetchMock).not.toHaveBeenCalled();
    await pause(100);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("q=Via%20Bel");
    expect(screen.getByText("Via Rodolfo Belenzani, Trento")).toBeOnTheScreen();
  });

  test("one or two letters suggest nothing, and clear what was suggested", async () => {
    photonAnswers(response);
    await render(<PlaceSearch onSelect={jest.fn()} />);
    await type("Tr");
    await pause();
    expect(fetchMock).not.toHaveBeenCalled();
    await type("Trento");
    await pause();
    expect(screen.getByText("Comune di Trento, Trento")).toBeOnTheScreen();
    await type("Tr");
    expect(screen.queryByText("Comune di Trento, Trento")).not.toBeOnTheScreen();
  });

  test("Search does not ask again after the pause", async () => {
    photonAnswers(response);
    await render(<PlaceSearch onSelect={jest.fn()} />);
    await searchFor("Trento");
    await pause();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("an answer to an older text is not shown", async () => {
    let answerOld: (value: Response) => void = () => {};
    fetchMock.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        answerOld = resolve;
      }),
    );
    fetchMock.mockResolvedValueOnce(
      Response.json({ type: "FeatureCollection", features: [] }),
    );
    await render(<PlaceSearch onSelect={jest.fn()} />);
    await type("Trento");
    await pause();
    await type("Xyzzy");
    await pause();
    expect(screen.getByText("No place found. Try adding the city.")).toBeOnTheScreen();
    await act(async () => {
      answerOld(Response.json(response));
    });
    expect(screen.queryByText("Comune di Trento, Trento")).not.toBeOnTheScreen();
  });
});
