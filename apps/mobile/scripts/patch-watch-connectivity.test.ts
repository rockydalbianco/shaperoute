import fs from "fs";
import os from "os";
import path from "path";

import {
  PATCHES,
  VERSION,
  patchPackage,
  patchSource,
} from "./patch-watch-connectivity";

/** The two lines as react-native-watch-connectivity 2.0.0 has them. */
const LIBRARY_LINES = [
  "    [self dispatchEventWithName:EVENT_WATCH_FILE_ERROR body:@{" +
    '@"fileInfo": fileInfo, @"error": error, @"errorUserInfo": error.userInfo}];',
  "    [self dispatchEventWithName:EVENT_WATCH_USER_INFO_ERROR body:@{" +
    '@"userInfo": [userInfoTransfer userInfo], @"error": dictionaryFromError(error)}];',
].join("\n");

/** A copy of the library in a temporary folder. */
function fakePackage(version: string, source: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "watch-patch-"));
  fs.mkdirSync(path.join(dir, "ios"));
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ version }));
  fs.writeFileSync(path.join(dir, "ios", "WatchConnectivity.mm"), source);
  return dir;
}

function readSource(dir: string): string {
  return fs.readFileSync(path.join(dir, "ios", "WatchConnectivity.mm"), "utf8");
}

describe("the nil guards in react-native-watch-connectivity", () => {
  it("guards the transfer's userInfo and the file error's userInfo", () => {
    const { source, changed } = patchSource(LIBRARY_LINES);
    expect(changed).toBe(true);
    expect(source).toContain('@"userInfo": [userInfoTransfer userInfo] ?: @{},');
    expect(source).toContain('@"errorUserInfo": error.userInfo ?: @{}}];');
    expect(source).toContain('@"error": dictionaryFromError(error)}];');
  });

  it("changes nothing the second time", () => {
    const once = patchSource(LIBRARY_LINES).source;
    expect(patchSource(once)).toEqual({ source: once, changed: false });
  });

  it("refuses a file without the expected lines", () => {
    expect(() => patchSource("// a new version of the library")).toThrow(
      /TASK-517 part B/,
    );
  });

  it("refuses a line found twice", () => {
    const twice = `${LIBRARY_LINES}\n${PATCHES[0].original}`;
    expect(() => patchSource(twice)).toThrow(/found 2/);
  });

  it("writes the patched file once, then leaves it", () => {
    const dir = fakePackage(VERSION, LIBRARY_LINES);
    expect(patchPackage(dir)).toBe(true);
    const patched = readSource(dir);
    expect(patched).toContain("?: @{}");
    expect(patchPackage(dir)).toBe(false);
    expect(readSource(dir)).toBe(patched);
  });

  it("refuses another version of the library and leaves its file", () => {
    const dir = fakePackage("2.1.0", LIBRARY_LINES);
    expect(() => patchPackage(dir)).toThrow(/2\.1\.0/);
    expect(readSource(dir)).toBe(LIBRARY_LINES);
  });

  it("matches the installed library", () => {
    const dir = path.dirname(
      require.resolve("react-native-watch-connectivity/package.json"),
    );
    const { version } = JSON.parse(
      fs.readFileSync(path.join(dir, "package.json"), "utf8"),
    );
    expect(version).toBe(VERSION);
    expect(() => patchSource(readSource(dir))).not.toThrow();
  });
});
