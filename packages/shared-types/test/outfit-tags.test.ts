import assert from "node:assert/strict";
import { test } from "node:test";

import request from "../fixtures/outfit-tags-request.json" with { type: "json" };
import {
  API_ERROR_CODES,
  OUTFIT_ITEMS,
  OUTFIT_TAG_REASONS,
  OUTFIT_TAGS_IN_POST,
  OUTFIT_TAGS_ON_PHOTO,
  REPORT_KINDS,
  type OutfitTagsRequest,
} from "../src/index.ts";

// The same JSON is what the API's test_outfit_tags.py sends (TASK-394).
test("the request fixture is the type", () => {
  const body = request as unknown as OutfitTagsRequest;
  assert.ok(body.tags.length > 0 && body.tags.length <= OUTFIT_TAGS_ON_PHOTO);
  for (const tag of body.tags) {
    assert.ok((OUTFIT_ITEMS as readonly string[]).includes(tag.item));
    assert.ok(tag.x >= 0 && tag.x <= 1 && tag.y >= 0 && tag.y <= 1);
    assert.ok(tag.brand.length > 0);
  }
  assert.ok(OUTFIT_TAGS_ON_PHOTO < OUTFIT_TAGS_IN_POST);
});

test("an item is reported, and refused with its own code and reasons", () => {
  assert.ok((REPORT_KINDS as readonly string[]).includes("outfit_tag"));
  assert.ok((API_ERROR_CODES as readonly string[]).includes("outfit_tag_rejected"));
  assert.equal(new Set(OUTFIT_TAG_REASONS).size, OUTFIT_TAG_REASONS.length);
});
