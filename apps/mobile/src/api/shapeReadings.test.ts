import shapeReadingNone from "@shaperoute/shared-types/fixtures/shape-reading-none.json";
import shapeReadingRequest from "@shaperoute/shared-types/fixtures/shape-reading-request.json";
import shapeReading from "@shaperoute/shared-types/fixtures/shape-reading.json";

import { requestShapeReading } from "./shapeReadings";

const URL = "http://192.168.1.23:8000";

function answers(response: Response): jest.MockedFunction<typeof fetch> {
  return jest.fn().mockResolvedValue(response);
}

test("posts the words and gets the shape they name", async () => {
  const fetchFn = answers(Response.json(shapeReading));
  await expect(
    requestShapeReading(URL, shapeReadingRequest.text, fetchFn),
  ).resolves.toEqual({ kind: "reading", shape: "horse" });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(`${URL}/shape-readings`);
  expect(init?.method).toBe("POST");
  expect(JSON.parse(String(init?.body))).toEqual(shapeReadingRequest);
});

test("no shape of the catalogue is a reading too", async () => {
  const outcome = await requestShapeReading(
    URL,
    "Batman",
    answers(Response.json(shapeReadingNone)),
  );
  expect(outcome).toEqual({ kind: "reading", shape: null });
});

test("the AI off is an error of the API, with its code", async () => {
  const error = { error: { code: "ai_unavailable", message: "is it running?" } };
  const outcome = await requestShapeReading(
    URL,
    "Garfield",
    answers(Response.json(error, { status: 503 })),
  );
  expect(outcome).toEqual({ kind: "api_error", ...error.error });
});

test("a network failure says where the API was looked for", async () => {
  const fetchFn = jest.fn().mockRejectedValue(new TypeError("Network request failed"));
  await expect(requestShapeReading(URL, "Nemo", fetchFn)).resolves.toEqual({
    kind: "unreachable",
    url: URL,
  });
});

test.each([
  ["a shape the app does not know", Response.json({ text: "casa", shape: "house" })],
  ["no text", Response.json({ shape: "star" })],
  ["not JSON", new Response("<html></html>")],
])("%s is a bad answer", async (_, response) => {
  const outcome = await requestShapeReading(URL, "casa", answers(response));
  expect(outcome).toEqual({ kind: "bad_answer", status: 200 });
});
