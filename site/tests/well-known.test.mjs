// The files iPhone and Android read to know that a link of the site may
// open the app (TASK-482 part C, ADR-0391).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { ID_PATTERN } from "../p/view.js";

const SITE = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = join(SITE, "..");
const read = (...parts) => readFileSync(join(...parts), "utf8");

const ASSOCIATION = [".well-known", "apple-app-site-association"];
const association = () => JSON.parse(read(SITE, ...ASSOCIATION));
const LINKS = [".well-known", "assetlinks.json"];
const links = () => JSON.parse(read(SITE, ...LINKS));
const ID = "0b7e5a94-6c1d-4f38-8e2a-9d4c1f6b3a57";

/** Apple's pattern: «?» is any one character, «*» any run of them. */
function matches(pattern, text) {
  const source = pattern
    .split("")
    .map((c) => (c === "?" ? "." : c === "*" ? ".*" : c.replace(/[.+^${}()|[\]\\]/g, "\\$&")))
    .join("");
  return new RegExp(`^${source}$`).test(text);
}

/** The value of the first `key` found anywhere in `value`. */
function find(value, key) {
  if (value === null || typeof value !== "object") {
    return undefined;
  }
  if (Object.hasOwn(value, key)) {
    return value[key];
  }
  for (const inner of Object.values(value)) {
    const found = find(inner, key);
    if (found !== undefined) {
      return found;
    }
  }
  return undefined;
}

test("the iPhone's file is plain JSON, with no extension and nothing but app links", () => {
  const text = read(SITE, ...ASSOCIATION);
  assert.doesNotThrow(() => JSON.parse(text));
  assert.deepEqual(Object.keys(association()), ["applinks"]);
  assert.deepEqual(Object.keys(association().applinks), ["details"]);
  assert.equal(association().applinks.details.length, 1);
});

test("the iPhone's file names the app of app.json, team and identifier", () => {
  const app = JSON.parse(read(REPO, "apps", "mobile", "app.json"));
  const team = find(app, "appleTeamId");
  const bundle = find(app, "bundleIdentifier");
  assert.match(team, /^[A-Z0-9]{10}$/);
  assert.ok(bundle);
  assert.deepEqual(association().applinks.details[0].appIDs, [`${team}.${bundle}`]);
});

test("only the page of a post opens the app, and only with a post's id after #", () => {
  const { components } = association().applinks.details[0];
  assert.deepEqual(
    components.map((one) => one["/"]),
    ["/p/", "/p", "/p/index.html"],
  );
  for (const one of components) {
    // No star in the path: no other page of the site is handed to the app.
    assert.ok(!one["/"].includes("*") && !one["/"].includes("?"), one["/"]);
    assert.ok(!("exclude" in one));
    assert.equal(typeof one["#"], "string");
    assert.ok(matches(one["#"], ID), "a post's id");
    assert.ok(matches(one["#"], ID.toUpperCase()));
    for (const other of ["", "42", `${ID}0`, ID.slice(1), `${ID}/more`]) {
      assert.ok(!matches(one["#"], other), `not «${other}»`);
    }
  }
});

test("the pattern after # has the shape of the ids the page takes", () => {
  const shape = association().applinks.details[0].components[0]["#"];
  assert.ok(ID_PATTERN.test(ID));
  assert.equal(shape.length, ID.length);
  assert.deepEqual(
    [...shape].map((c, i) => (c === "-" ? i : null)).filter((i) => i !== null),
    [...ID].map((c, i) => (c === "-" ? i : null)).filter((i) => i !== null),
  );
});

test("Android's file is one statement: this app may open the site's links", () => {
  assert.equal(links().length, 1);
  const [one] = links();
  assert.deepEqual(Object.keys(one).sort(), ["relation", "target"]);
  assert.deepEqual(one.relation, ["delegate_permission/common.handle_all_urls"]);
  assert.deepEqual(Object.keys(one.target).sort(), [
    "namespace",
    "package_name",
    "sha256_cert_fingerprints",
  ]);
  assert.equal(one.target.namespace, "android_app");
});

test("Android's file names the package of app.json", () => {
  const app = JSON.parse(read(REPO, "apps", "mobile", "app.json"));
  const pack = find(find(app, "android"), "package");
  assert.ok(pack);
  assert.equal(links()[0].target.package_name, pack);
});

// The key the builds are uploaded to Play with (EAS's): Play signs what
// people install with its own keys, so this one opens no link.
const UPLOAD_KEY =
  "E5:29:0A:6E:3D:35:EB:40:AD:46:52:B0:AF:F3:02:7B:43:65:14:AB:7B:BA:B5:E6:8A:B6:49:AF:7F:62:14:74";

test("Android's file gives the keys Play signs the app with, as Play writes them", () => {
  const prints = links()[0].target.sha256_cert_fingerprints;
  // The one in use (its classic and its post-quantum certificate) and the
  // one before it: «Copy all certificate fingerprints» in the Play Console.
  assert.equal(prints.length, 3);
  assert.equal(new Set(prints).size, prints.length);
  for (const one of prints) {
    // 32 bytes in capital hexadecimal, a colon between each two.
    assert.match(one, /^[0-9A-F]{2}(?::[0-9A-F]{2}){31}$/);
  }
  assert.ok(!prints.includes(UPLOAD_KEY), "not the key of the uploads");
});

test("the server's copy (DEPLOY.md F.14) takes the folder and says its type", () => {
  const deploy = read(REPO, "docs", "DEPLOY.md");
  const line = deploy.match(/git archive origin\/main ((?:site\/\S+ ?)+)\|/);
  const copied = line ? line[1].trim().split(/\s+/) : [];
  assert.ok(copied.includes("site/.well-known"), "DEPLOY.md F.14 copies site/.well-known");
  // With no extension the server would not say it is JSON, and Apple asks it.
  assert.ok(
    deploy.includes(
      "header /.well-known/apple-app-site-association Content-Type application/json",
    ),
    "DEPLOY.md F.14 gives the file its type",
  );
  // Android's ends in .json: the server says its type by itself. The check
  // from outside is written beside the iPhone's.
  assert.ok(
    deploy.includes("https://getmuw.app/.well-known/assetlinks.json"),
    "DEPLOY.md F.14 checks Android's file from outside",
  );
});
