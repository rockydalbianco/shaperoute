import { POST_LINK_PAGE } from "@shaperoute/shared-types";
import { readFileSync } from "fs";
import path from "path";

import appJson from "../app.json";
import { postLinkIn } from "../src/links/postLinkIn";

/**
 * The link of a post opens the app without passing by the page (TASK-482
 * part D, ADR-0391): the app says to the phone which addresses are its own,
 * and the site says the same of the app in its two `.well-known` files
 * (part C). The phone opens the app only when the two agree, so here they
 * are read together.
 */
const SITE = path.join(__dirname, "..", "..", "..", "site", ".well-known");
const fromSite = (name: string) =>
  JSON.parse(readFileSync(path.join(SITE, name), "utf8"));

const page = new URL(POST_LINK_PAGE);
const ID = "0b7e5a94-6c1d-4f38-8e2a-9d4c1f6b3a57";

type Filter = {
  action: string;
  autoVerify?: boolean;
  data: { scheme: string; host: string; path?: string }[];
  category: string[];
};
const filters: Filter[] = appJson.expo.android.intentFilters;

it("the iPhone app claims the links of the site of a post's link, and no other", () => {
  expect(page.protocol).toBe("https:");
  expect(appJson.expo.ios.associatedDomains).toEqual([`applinks:${page.host}`]);
});

it("the site names the iPhone app of app.json", () => {
  // The team is among the options of the plugin that builds the watch.
  const team = /"appleTeamId":\s*"([A-Z0-9]{10})"/.exec(JSON.stringify(appJson))?.[1];
  expect(team).toBeDefined();
  const { details } = fromSite("apple-app-site-association").applinks;
  expect(details).toHaveLength(1);
  expect(details[0].appIDs).toEqual([`${team}.${appJson.expo.ios.bundleIdentifier}`]);
});

it("the Android app asks Google to check one filter: links of the site, to view", () => {
  expect(filters).toHaveLength(1);
  const [filter] = filters;
  expect(filter.action).toBe("VIEW");
  // Without it Android shows the «open with» choice instead of the app.
  expect(filter.autoVerify).toBe(true);
  expect([...filter.category].sort()).toEqual(["BROWSABLE", "DEFAULT"]);
  for (const one of filter.data) {
    expect(Object.keys(one).sort()).toEqual(["host", "path", "scheme"]);
    expect(one.scheme).toBe("https");
    expect(one.host).toBe(page.host);
  }
});

it("Android takes only the page of a post, by its exact paths: the iPhone's", () => {
  const { components } = fromSite("apple-app-site-association").applinks.details[0];
  const iphone: string[] = components.map((one: { "/": string }) => one["/"]);
  const android = filters[0].data.map((one) => one.path);
  // Exact paths, never a prefix: «/p» as a prefix would take «/privacy» too.
  expect(android).toEqual(iphone);
  expect(android).toContain(page.pathname);
  expect(android).not.toContain("/");
});

it("the site names the Android app of app.json", () => {
  const statements = fromSite("assetlinks.json");
  expect(statements).toHaveLength(1);
  expect(statements[0].relation).toEqual([
    "delegate_permission/common.handle_all_urls",
  ]);
  expect(statements[0].target.package_name).toBe(appJson.expo.android.package);
});

it("every address the phone may hand over is one the app reads the post of", () => {
  for (const one of filters[0].data) {
    expect(postLinkIn(`${one.scheme}://${one.host}${one.path}#${ID}`)).toBe(ID);
  }
});

it("the app has a scheme of its own, a plain name", () => {
  expect(appJson.expo.scheme).toBe("muw");
});
