import type { OutfitTag } from "@shaperoute/shared-types";

import {
  draftOf,
  draftProblem,
  hasAddress,
  inBox,
  linkProblem,
  type OutfitDraft,
  photoFrame,
  pointIn,
  pointOn,
  requestOf,
  roomProblem,
  tagsOfPhoto,
  totalsOf,
} from "./outfitTags";

const TAG: OutfitTag = {
  id: "t1",
  x: 0.5,
  y: 0.8,
  item: "shoes",
  brand: "Nike",
  product_name: "Pegasus 41",
  store: "nike.com",
  url: null,
  hidden: false,
  opens: null,
  shops: null,
};

const DRAFT: OutfitDraft = {
  id: null,
  x: 0.2,
  y: 0.3,
  item: "top",
  brand: " Asics ",
  product_name: " ",
  url: "",
};

test("an https page on a domain name may go", () => {
  expect(linkProblem("https://www.nike.com/it/t/pegasus-41?color=black")).toBeNull();
  expect(linkProblem("https://xn--80ak6aa92e.com/")).toBeNull();
  expect(linkProblem(null)).toBeNull();
  expect(linkProblem("  ")).toBeNull();
});

test("what is not an https page on a domain name is refused at once", () => {
  for (const url of [
    "http://www.nike.com/",
    "nike.com/pegasus",
    "https://anna:secret@nike.com/",
    "https://nike.com:8443/",
    "https://192.168.1.4/shop",
    "https://localhost/",
    "https://[::1]/",
    "https://nike.com/a b",
  ]) {
    expect([url, linkProblem(url)]).toEqual([url, "not_https"]);
  }
});

test("a shortener, or a host under one, is refused", () => {
  expect(linkProblem("https://bit.ly/3abc")).toBe("shortened");
  expect(linkProblem("https://amzn.to/xyz")).toBe("shortened");
  expect(linkProblem("https://l.instagram.com/?u=https%3A%2F%2Fnike.com")).toBe(
    "shortened",
  );
  expect(linkProblem("https://BIT.LY/3abc")).toBe("shortened");
});

test("an address in the brand or the model goes in the link box", () => {
  expect(hasAddress("Nike")).toBe(false);
  expect(hasAddress("On Cloudmonster 2")).toBe(false);
  expect(hasAddress("www.nike.com")).toBe(true);
  expect(hasAddress("buy at nike.com")).toBe(true);
  expect(hasAddress("https://x.y")).toBe(true);
  expect(draftProblem({ ...DRAFT, product_name: "see shop.it" })).toBe("link_in_text");
  expect(draftProblem({ ...DRAFT, url: "http://nike.com" })).toBe("not_https");
  expect(draftProblem(DRAFT)).toBeNull();
});

test("5 on a photo and 10 in a post at most", () => {
  expect(roomProblem(4, 9)).toBeNull();
  expect(roomProblem(5, 5)).toBe("too_many_on_photo");
  expect(roomProblem(2, 10)).toBe("too_many_in_post");
});

test("what goes to the API: trimmed, empty fields as null, the id when kept", () => {
  expect(requestOf(DRAFT)).toEqual({
    x: 0.2,
    y: 0.3,
    item: "top",
    brand: "Asics",
    product_name: null,
    url: null,
  });
  expect(requestOf({ ...DRAFT, id: "t9", url: " https://asics.com/x " })).toEqual({
    id: "t9",
    x: 0.2,
    y: 0.3,
    item: "top",
    brand: "Asics",
    product_name: null,
    url: "https://asics.com/x",
  });
});

test("an item of the API becomes one its owner changes", () => {
  expect(draftOf({ ...TAG, url: "https://nike.com/p", opens: 3, shops: 1 })).toEqual({
    id: "t1",
    x: 0.5,
    y: 0.8,
    item: "shoes",
    brand: "Nike",
    product_name: "Pegasus 41",
    url: "https://nike.com/p",
  });
});

test("the items of a photo: none before TASK-394, an unknown kind left out", () => {
  expect(tagsOfPhoto({})).toEqual([]);
  expect(
    tagsOfPhoto({ outfit_tags: [TAG, { ...TAG, id: "t2", item: "skis" }] }),
  ).toEqual([TAG]);
});

test("whole, a photo sits in the middle of the box; cut, it fills it", () => {
  const box = { width: 400, height: 500 };
  const wide = { width: 1600, height: 1000 };
  expect(photoFrame(box, wide, "contain")).toEqual({
    left: 0,
    top: 125,
    width: 400,
    height: 250,
  });
  expect(photoFrame(box, wide, "cover")).toEqual({
    left: -200,
    top: 0,
    width: 800,
    height: 500,
  });
});

test("a dot stands where it was put, at any size, and stays on the photo", () => {
  const frame = photoFrame(
    { width: 400, height: 500 },
    { width: 1600, height: 1000 },
    "contain",
  );
  expect(pointIn(frame, 0.5, 0.5)).toEqual({ left: 200, top: 250 });
  expect(pointOn(frame, 200, 250)).toEqual({ x: 0.5, y: 0.5 });
  // Over the edge of the photo: on its edge.
  expect(pointOn(frame, -30, 10)).toEqual({ x: 0, y: 0 });
  const cover = photoFrame(
    { width: 400, height: 500 },
    { width: 1600, height: 1000 },
    "cover",
  );
  // Cut away by the box: not shown.
  expect(inBox({ width: 400, height: 500 }, pointIn(cover, 0.05, 0.5))).toBe(false);
  expect(inBox({ width: 400, height: 500 }, pointIn(cover, 0.5, 0.5))).toBe(true);
});

test("the totals are the author's only", () => {
  expect(totalsOf([TAG, { ...TAG, id: "t2" }])).toBeNull();
  expect(
    totalsOf([
      { ...TAG, opens: 10, shops: 2 },
      { ...TAG, id: "t2", opens: 5, shops: 1 },
    ]),
  ).toEqual({ opens: 15, shops: 3 });
});
