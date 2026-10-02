import { asSuggestion, suggestCities } from "./cities";

const verona = { label: "Verona, Veneto, Italy", point: [45.4385, 10.9924] };
const arena = {
  label: "Verona Arena, Verona, Italy",
  point: [45.439, 10.9949],
  kind: "place",
};

test("cities and places while typing, each a city unless said (TASK-138)", async () => {
  const fetchFn = jest
    .fn()
    .mockResolvedValue(Response.json({ places: [verona, arena] }));
  const got = await suggestCities("http://api", " ver ", { fetchFn, key: null });
  expect(fetchFn.mock.calls[0][0]).toBe("http://api/city-suggestions?q=ver");
  expect(got).toEqual([
    { ...verona, kind: "city" },
    { ...arena, kind: "place" },
  ]);
});

test("an unknown kind is a city", () => {
  const odd = { label: "X", point: [1, 2] as [number, number] };
  expect(asSuggestion({ ...odd, kind: "town" as "city" }).kind).toBe("city");
  expect(asSuggestion(odd).kind).toBe("city");
});

test("one letter asks nothing; a failure is null", async () => {
  const fetchFn = jest.fn().mockRejectedValue(new TypeError("Network request failed"));
  expect(await suggestCities("http://api", "v", { fetchFn, key: null })).toEqual([]);
  expect(fetchFn).not.toHaveBeenCalled();
  expect(await suggestCities("http://api", "ver", { fetchFn, key: null })).toBeNull();
});
