import { render, screen } from "@testing-library/react-native";

import { qrCodeOf } from "./qrCode";
import { darkRuns, QrView } from "./QrView";

it("joins each row's dark modules into runs", () => {
  expect(darkRuns([true, true, false, true, false, false, true])).toEqual([
    [0, 2],
    [3, 1],
    [6, 1],
  ]);
  expect(darkRuns([false, false])).toEqual([]);
});

it("draws one view per dark run, on a light square", async () => {
  const code = qrCodeOf("HELLO WORLD")!;
  await render(<QrView code={code} size={290} dark="#000" light="#fff" />);
  const square = screen.getByTestId("qr-code");
  const runs = code.modules.reduce((sum, row) => sum + darkRuns(row).length, 0);
  expect(square.children).toHaveLength(runs);
});
