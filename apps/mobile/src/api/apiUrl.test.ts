import { apiKey, apiUrl, apiUrlFromHost, keyHeaders } from "./apiUrl";

test.each([
  ["192.168.1.23:8081", "http://192.168.1.23:8000"],
  ["192.168.1.23", "http://192.168.1.23:8000"],
  ["[fe80::1]:8081", "http://[fe80::1]:8000"],
])("the API sits beside the Expo server %s", (hostUri, url) => {
  expect(apiUrlFromHost(hostUri)).toBe(url);
});

test.each([undefined, null, "", ":8081", "exp://nowhere"])(
  "without a usable host (%p) there is no address",
  (hostUri) => {
    expect(apiUrlFromHost(hostUri)).toBeNull();
  },
);

test.each([
  ["http://100.101.102.103:8000", "http://100.101.102.103:8000"],
  [" https://api.example.org/ ", "https://api.example.org"],
])(
  "a configured address %p wins over the Expo server (TASK-081)",
  (configured, url) => {
    expect(apiUrl(configured, "192.168.1.23:8081")).toBe(url);
  },
);

test.each([undefined, "", "   "])(
  "without a configured address (%p) the API is beside the Expo server",
  (configured) => {
    expect(apiUrl(configured, "192.168.1.23:8081")).toBe("http://192.168.1.23:8000");
  },
);

test("a configured key goes in the X-API-Key header; none, no header", () => {
  expect(apiKey(" secret-key-for-tests ")).toBe("secret-key-for-tests");
  expect(apiKey(undefined)).toBeNull();
  expect(apiKey("  ")).toBeNull();
  expect(keyHeaders("secret-key-for-tests")).toEqual({
    "X-API-Key": "secret-key-for-tests",
  });
  expect(keyHeaders(null)).toEqual({});
});
