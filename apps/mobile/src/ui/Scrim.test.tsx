import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { Scrim } from "./Scrim";

test("an image stretched over the foot of the photo, out of the way", async () => {
  const { toJSON } = await render(<Scrim height={150} />);
  const scrim = toJSON() as unknown as {
    type: string;
    props: { style: unknown; resizeMode: string; accessible: boolean };
  };
  expect(scrim.type).toBe("Image");
  expect(scrim.props.resizeMode).toBe("stretch");
  expect(scrim.props.accessible).toBe(false);
  const style = StyleSheet.flatten(scrim.props.style) as {
    position: string;
    bottom: number;
    height: number;
  };
  expect(style.position).toBe("absolute");
  expect(style.bottom).toBe(0);
  expect(style.height).toBe(150);
});
