// The files iPhone and Android read to know that a link of the site may
// open the app (TASK-482 part C, ADR-0391). Only the iPhone's is here yet.
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
});
