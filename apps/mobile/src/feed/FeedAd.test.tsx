import { render, screen } from "@testing-library/react-native";

import { FAKE_AD_VIEWS, fakeNativeAd } from "../ads/testing";
import { translate } from "../i18n/translate";
import { fontSize } from "../theme/tokens";
import { FeedAd, mediaHeight } from "./FeedAd";

test("says «Sponsored» first, as large as a runner's name (ADR-0198)", async () => {
  await render(<FeedAd ad={fakeNativeAd()} views={FAKE_AD_VIEWS} width={340} />);
  const sponsored = screen.getByText("Sponsored");
  expect(sponsored).toHaveStyle({ fontSize: fontSize.body });
  // The first words of the card, above the advertiser and the ad.
  const [first] = screen.getAllByText(/./);
  expect(first).toBe(sponsored);
});

test("shows the ad's parts, each told to the SDK", async () => {
  await render(<FeedAd ad={fakeNativeAd()} views={FAKE_AD_VIEWS} width={340} />);
  expect(screen.getByTestId("asset-headline")).toHaveTextContent(
    "Trail shoes, 20% off",
  );
  expect(screen.getByTestId("asset-body")).toHaveTextContent(
    "Light, with grip on wet rock.",
  );
  expect(screen.getByTestId("asset-advertiser")).toHaveTextContent("Shoe Shop");
  expect(screen.getByTestId("asset-callToAction")).toHaveTextContent("Shop now");
  expect(screen.getByTestId("asset-icon")).toBeOnTheScreen();
  // The picture as wide as the card, for its shape.
  expect(screen.getByTestId("ad-media")).toHaveStyle({ width: 340, height: 170 });
});

test("nothing of a post: no score, no times, not a button that opens the map", async () => {
  await render(<FeedAd ad={fakeNativeAd()} views={FAKE_AD_VIEWS} width={340} />);
  expect(screen.queryByText("out of 100")).toBeNull();
  expect(screen.queryByTestId("feed-drawing")).toBeNull();
  expect(screen.queryByRole("button", { name: /route/i })).toBeNull();
});

test("an ad without icon, advertiser, text or button shows what it has", async () => {
  await render(
    <FeedAd
      ad={fakeNativeAd({ icon: null, advertiser: null, body: "", callToAction: "" })}
      views={FAKE_AD_VIEWS}
      width={340}
    />,
  );
  expect(screen.getByText("Sponsored")).toBeOnTheScreen();
  expect(screen.getByTestId("asset-headline")).toBeOnTheScreen();
  for (const part of ["icon", "advertiser", "body", "callToAction"]) {
    expect(screen.queryByTestId(`asset-${part}`)).toBeNull();
  }
});

test("«Sponsored» in the five languages of the app", () => {
  expect(translate("en", "Sponsored")).toBe("Sponsored");
  expect(translate("de", "Sponsored")).toBe("Gesponsert");
  expect(translate("it", "Sponsored")).toBe("Sponsorizzato");
  expect(translate("es", "Sponsored")).toBe("Patrocinado");
  expect(translate("fr", "Sponsored")).toBe("Sponsorisé");
});

test("the picture keeps its shape, never taller than wide", () => {
  expect(mediaHeight(320, 2)).toBe(160);
  expect(mediaHeight(320, 1)).toBe(320);
  // A tall picture: square at most.
  expect(mediaHeight(320, 0.5)).toBe(320);
  // No shape given: a wide screen's.
  expect(mediaHeight(320, undefined)).toBe(180);
  expect(mediaHeight(320, 0)).toBe(180);
});
