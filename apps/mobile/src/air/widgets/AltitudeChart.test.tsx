/**
 * The altitude chart (TASK-479 parts B1 and E3): bars of the height, and
 * the volumes of the pilot's file behind them as bands.
 */
import { render, screen } from "@testing-library/react-native";

import { color } from "../../theme/tokens";
import type { ProfileBand } from "../airspaceProfile";
import { AltitudeChart, BAND_REACH_M, chartSpan } from "./AltitudeChart";

const palette = color;
const band = (floorM: number, ceilingM: number, danger = true): ProfileBand => ({
  floorM,
  ceilingM,
  danger,
});

describe("chartSpan", () => {
  it("is the heights' span, at least 50 m tall", () => {
    expect(chartSpan([1000, 1010], [])).toEqual({ low: 1000, high: 1050 });
    expect(chartSpan([900, 1200], [])).toEqual({ low: 900, high: 1200 });
  });

  it("reaches out to a limit near it, not to one far off", () => {
    expect(chartSpan([1000, 1200], [[band(800, 1400)]])).toEqual({
      low: 800,
      high: 1400,
    });
    const far = BAND_REACH_M + 1;
    expect(chartSpan([1000, 1200], [[band(1000 - far, 1200 + far)]])).toEqual({
      low: 1000,
      high: 1200,
    });
    expect(
      chartSpan(
        [1000, 1200],
        [[band(Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY)]],
      ),
    ).toEqual({ low: 1000, high: 1200 });
  });
});

describe("AltitudeChart", () => {
  it("draws a band where the pilot was over a volume, none elsewhere", async () => {
    await render(
      <AltitudeChart
        series={[1000, 1100, 1200]}
        width={90}
        height={60}
        palette={palette}
        bands={[[], [band(900, 1300)], [band(900, 1300, false), band(1150, 1400)]]}
      />,
    );
    const drawn = screen.getAllByTestId("altitude-chart-band");
    expect(drawn).toHaveLength(3);
    expect(drawn[0]).toHaveStyle({ backgroundColor: palette.error });
    expect(drawn[1]).toHaveStyle({ backgroundColor: palette.warning });
  });

  it("draws no bands without a file", async () => {
    await render(
      <AltitudeChart series={[1000, 1100]} width={60} height={60} palette={palette} />,
    );
    expect(screen.queryAllByTestId("altitude-chart-band")).toHaveLength(0);
  });
});
