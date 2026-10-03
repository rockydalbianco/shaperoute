import assert from "node:assert/strict";
import { test } from "node:test";

import follow from "../fixtures/follow.json" with { type: "json" };
import peoplePage from "../fixtures/people-page.json" with { type: "json" };
import people from "../fixtures/people.json" with { type: "json" };
import publicProfile from "../fixtures/public-profile.json" with { type: "json" };
import {
  FOLLOW_STATES,
  type Follow,
  type FollowState,
  type PeopleFound,
  type PeoplePage,
  PEOPLE_FOUND_MAX,
  type PublicProfile,
} from "../src/index.ts";

// The same JSON is validated by the API's test_follows.py (TASK-211).
const found: PeopleFound = people;
const page: PeoplePage = peoplePage;
const asked: Follow = {
  follow: follow.follow === "following" ? "following" : "requested",
};
const seen: PublicProfile = {
  ...publicProfile,
  follow: FOLLOW_STATES.find((state) => state === publicProfile.follow),
};

test("a person in a list is a name, a picture and a public id, nothing else", () => {
  for (const person of [...found.people, ...page.people]) {
    assert.deepEqual(Object.keys(person).sort(), ["photo", "public_id", "username"]);
  }
  assert.ok(found.people.length <= PEOPLE_FOUND_MAX);
  assert.equal(found.people[0]?.public_id, publicProfile.public_id);
});

test("a page of people says how many there are and where the next begins", () => {
  assert.deepEqual(Object.keys(page).sort(), ["next", "people", "total"]);
  assert.ok(page.total >= page.people.length);
  assert.match(page.next ?? "", /^\d{1,17}-[0-9a-f]{32}$/);
});

test("asking to follow answers where the one who asked stands", () => {
  assert.deepEqual(Object.keys(follow), ["follow"]);
  assert.equal(asked.follow, follow.follow);
});

test("a profile says how many follow it and where the viewer stands", () => {
  const state: FollowState | undefined = seen.follow;
  assert.ok(state !== undefined && FOLLOW_STATES.includes(state));
  assert.equal(typeof seen.followers, "number");
  assert.equal(typeof seen.following, "number");
});
