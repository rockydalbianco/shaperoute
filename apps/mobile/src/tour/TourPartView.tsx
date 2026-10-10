import type { ReactNode } from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";

import { useTourPart } from "./tourParts";

type Props = {
  /** Its name for the tour (`TOUR_PART`). */
  name: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/** A view the tour of the first opening can show by `name` (TASK-266): a
 * plain `View` otherwise. */
export function TourPartView({ name, style, children }: Props) {
  const ref = useTourPart(name);
  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  );
}
