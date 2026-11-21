/**
 * The units of the flight screen (TASK-479 part B1): the app's, and feet
 * and knots as the pilot's choice.
 */
import {
  altitudeText,
  bearingText,
  clockText,
  defaultFlightUnits,
  distanceText,
  distanceUnit,
  durationText,
  glideText,
  heightChangeText,
  isFlightUnits,
  NO_VALUE,
  speedText,
  varioText,
} from "./flightUnits";

describe("flight units", () => {
  it("start as the app's", () => {
    expect(defaultFlightUnits("km")).toEqual({ altitude: "m", vario: "mps", speed: "kmh" });
    expect(defaultFlightUnits("mi")).toEqual({ altitude: "ft", vario: "fpm", speed: "mph" });
  });

  it("are read back only when whole", () => {
    expect(isFlightUnits({ altitude: "ft", vario: "kt", speed: "kt" })).toBe(true);
    expect(isFlightUnits({ altitude: "yd", vario: "kt", speed: "kt" })).toBe(false);
    expect(isFlightUnits(null)).toBe(false);
  });
});

describe("texts", () => {
  it("altitude in metres and feet", () => {
    expect(altitudeText(1234.4, "m")).toBe("1234");
    expect(altitudeText(1000, "ft")).toBe("3281");
    expect(altitudeText(-0.2, "m")).toBe("0");
    expect(altitudeText(null, "m")).toBe(NO_VALUE);
    expect(heightChangeText(120, "m")).toBe("+120");
    expect(heightChangeText(-40, "m")).toBe("-40");
  });

  it("vario with its sign", () => {
    expect(varioText(1.24, "mps")).toBe("+1.2");
    expect(varioText(-0.84, "mps")).toBe("-0.8");
    expect(varioText(0.01, "mps")).toBe("0.0");
    // 1 m/s is 196.85 ft/min and 1.94 kt.
    expect(varioText(1, "fpm")).toBe("+200");
    expect(varioText(-1, "fpm")).toBe("-200");
    expect(varioText(1, "kt")).toBe("+1.9");
    expect(varioText(null, "kt")).toBe(NO_VALUE);
  });

  it("speed in km/h, mph and knots", () => {
    expect(speedText(10, "kmh")).toBe("36");
    expect(speedText(10, "mph")).toBe("22");
    expect(speedText(10, "kt")).toBe("19");
  });

  it("distance in the app's units", () => {
    expect(distanceText(850, "km")).toBe("850");
    expect(distanceUnit(850, "km")).toBe("m");
    expect(distanceText(12_400, "km")).toBe("12.4");
    expect(distanceUnit(12_400, "km")).toBe("km");
    expect(distanceText(16_093, "mi")).toBe("10.0");
    expect(distanceUnit(100, "mi")).toBe("ft");
  });

  it("bearing, glide, duration, clock", () => {
    expect(bearingText(359.6)).toBe("0°");
    expect(bearingText(-90)).toBe("270°");
    expect(glideText(8.44)).toBe("8.4");
    expect(glideText(23.6)).toBe("24");
    expect(durationText(309_000)).toBe("5:09");
    expect(durationText(3_909_000)).toBe("1:05:09");
    expect(durationText(null)).toBe(NO_VALUE);
    expect(clockText(new Date(2026, 10, 21, 9, 5).getTime())).toBe("09:05");
  });
});
