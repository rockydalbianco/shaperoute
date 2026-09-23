import { apiUrlFromHost } from "./apiUrl";

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
