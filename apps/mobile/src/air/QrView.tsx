import { View } from "react-native";

import type { QrCode } from "./qrCode";

/**
 * A QR code drawn with views (TASK-479 part D4): one view per run of dark
 * modules in a row, on a light square with the four modules of quiet zone
 * the readers want. Dark on light whatever the app's tone: a reader needs
 * it so.
 */

/** Modules of light border around the code. */
export const QUIET_ZONE = 4;

/** The dark runs of each row: [start, length]. */
export function darkRuns(row: readonly boolean[]): [number, number][] {
  const runs: [number, number][] = [];
  let start = -1;
  row.forEach((dark, x) => {
    if (dark && start < 0) {
      start = x;
    } else if (!dark && start >= 0) {
      runs.push([start, x - start]);
      start = -1;
    }
  });
  if (start >= 0) {
    runs.push([start, row.length - start]);
  }
  return runs;
}

export function QrView({
  code,
  size,
  dark,
  light,
}: {
  code: QrCode;
  /** The whole square, points. */
  size: number;
  dark: string;
  light: string;
}) {
  const module = size / (code.size + QUIET_ZONE * 2);
  return (
    <View
      style={{ width: size, height: size, backgroundColor: light }}
      accessibilityRole="image"
      testID="qr-code"
    >
      {code.modules.map((row, y) =>
        darkRuns(row).map(([x, length]) => (
          <View
            key={`${y}-${x}`}
            style={{
              position: "absolute",
              left: (QUIET_ZONE + x) * module,
              top: (QUIET_ZONE + y) * module,
              // A hair over, so no seam shows between neighbours.
              width: length * module + 0.5,
              height: module + 0.5,
              backgroundColor: dark,
            }}
          />
        )),
      )}
    </View>
  );
}
