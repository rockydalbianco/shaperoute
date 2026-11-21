import { POST_LINK_PAGE } from "@shaperoute/shared-types";

import { postLinkOf } from "../feed/postLink";
import { postLinkIn } from "./postLinkIn";

const ID = "0b7e5a94-6c1d-4f38-8e2a-9d4c1f6b3a57";

describe("postLinkIn", () => {
  it("reads the post of the link «Share link» gives", () => {
    const link = postLinkOf({ id: ID, linkable: true });
    expect(link).toBe(`${POST_LINK_PAGE}${ID}`);
    expect(postLinkIn(link)).toBe(ID);
  });

  it("reads the page as the site may serve it", () => {
    expect(postLinkIn(`https://getmuw.app/p#${ID}`)).toBe(ID);
    expect(postLinkIn(`https://getmuw.app/p/index.html#${ID}`)).toBe(ID);
    expect(postLinkIn(`https://getmuw.app/p/?from=chat#${ID}`)).toBe(ID);
    expect(postLinkIn(`  https://getmuw.app/p/#${ID}\n`)).toBe(ID);
  });

  it("gives the id in small letters, as the API writes it", () => {
    expect(postLinkIn(`https://getmuw.app/p/#${ID.toUpperCase()}`)).toBe(ID);
  });

  it("takes nothing that is not shaped like a drawing's id", () => {
    expect(postLinkIn("https://getmuw.app/p/")).toBeNull();
    expect(postLinkIn("https://getmuw.app/p/#")).toBeNull();
    expect(postLinkIn("https://getmuw.app/p/#42")).toBeNull();
    expect(postLinkIn(`https://getmuw.app/p/#${ID}/more`)).toBeNull();
    expect(postLinkIn(`https://getmuw.app/p/#${ID}?x=1`)).toBeNull();
    expect(postLinkIn(`https://getmuw.app/p/?id=${ID}`)).toBeNull();
  });

  it("takes no other page, site or scheme", () => {
    expect(postLinkIn(`https://getmuw.app/#${ID}`)).toBeNull();
    expect(postLinkIn(`https://getmuw.app/live/#${ID}`)).toBeNull();
    expect(postLinkIn(`https://getmuw.app/p/other#${ID}`)).toBeNull();
    expect(postLinkIn(`https://getmuw.app.example.com/p/#${ID}`)).toBeNull();
    expect(
      postLinkIn(`https://example.com/?to=https://getmuw.app/p/#${ID}`),
    ).toBeNull();
    expect(postLinkIn(`http://getmuw.app/p/#${ID}`)).toBeNull();
    expect(postLinkIn(`exp://192.168.1.10:8081/--/p/#${ID}`)).toBeNull();
  });

  it("takes nothing that is not an address", () => {
    expect(postLinkIn(null)).toBeNull();
    expect(postLinkIn(undefined)).toBeNull();
    expect(postLinkIn("")).toBeNull();
    expect(postLinkIn({ url: `https://getmuw.app/p/#${ID}` })).toBeNull();
  });
});
