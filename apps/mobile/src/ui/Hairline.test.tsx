import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { color } from "../theme/tokens";
import { Hairline } from "./Hairline";

test("one device pixel of the text at a fifth of its strength", async () => {
  const { toJSON } = await render(<Hairline />);
  const line = toJSON() as unknown as { props: { style: unknown } };
  const style = StyleSheet.flatten(line.props.style) as {
    height: number;
    backgroundColor: string;
  };
  expect(style.height).toBe(StyleSheet.hairlineWidth);
  expect(style.backgroundColor).toBe(color.hairline);
  // `#RRGGBBAA`, the text with 0x33 of alpha.
  expect(color.hairline).toBe(`${color.text}33`);
});
