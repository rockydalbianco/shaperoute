import { type ReactNode, useRef, useState } from "react";
import { type GestureResponderEvent, Pressable, StyleSheet, View } from "react-native";

import { t } from "../i18n";
import type { Palette } from "../theme/tokens";
import type { Cell } from "./flightLayout";
import { dropSpot, type GridMetrics, stretchSize } from "./layoutDrag";

/**
 * A widget in the flight screen's editor that the pilot drags (TASK-479
 * part B3, ADR-0388): a touch that moves takes the widget along, an
 * outline shows the cells it will land on, and letting go puts it there.
 * The selected widget has a handle on its corner: dragging it sizes the
 * widget, cell by cell. A touch that does not move only selects, as in
 * part B2, and the arrows stay for gloved fingers.
 */

/** A touch moving this far is a drag, not a tap. */
export const DRAG_FROM = 8;
/** The corner handle, points: a thumb's target. */
export const HANDLE = 36;

type Drag = { kind: "move" | "size"; x0: number; y0: number; dx: number; dy: number };

const at = (event: GestureResponderEvent) => ({
  x: event.nativeEvent.pageX,
  y: event.nativeEvent.pageY,
});

export function EditorCell({
  cell,
  grid,
  selected,
  palette,
  onSelect,
  onDrop,
  onStretch,
  children,
  testID,
}: {
  cell: Cell;
  grid: GridMetrics;
  selected: boolean;
  palette: Palette;
  onSelect: () => void;
  /** Let go with its corner on `col`, `row`. */
  onDrop: (col: number, row: number) => void;
  /** Let go at `w` × `h` cells. */
  onStretch: (w: number, h: number) => void;
  children: ReactNode;
  testID: string;
}) {
  const [drag, setDrag] = useState<Drag | null>(null);
  // Where the touch began, to tell a drag from a tap.
  const start = useRef<{ x: number; y: number } | null>(null);
  const left = (col: number) => grid.gap + col * (grid.cellW + grid.gap);
  const top = (row: number) => grid.gap + row * (grid.cellH + grid.gap);
  const width = (w: number) => grid.cellW * w + grid.gap * (w - 1);
  const height = (h: number) => grid.cellH * h + grid.gap * (h - 1);

  const moved = (event: GestureResponderEvent) => {
    const now = at(event);
    return start.current === null
      ? false
      : Math.hypot(now.x - start.current.x, now.y - start.current.y) >= DRAG_FROM;
  };
  const follow = (event: GestureResponderEvent) => {
    const now = at(event);
    setDrag((was) =>
      was === null ? was : { ...was, dx: now.x - was.x0, dy: now.y - was.y0 },
    );
  };
  const finish = (event: GestureResponderEvent | null) => {
    if (event !== null && drag !== null) {
      const now = at(event);
      const dx = now.x - drag.x0;
      const dy = now.y - drag.y0;
      if (drag.kind === "move") {
        const spot = dropSpot(cell, dx, dy, grid);
        onDrop(spot.col, spot.row);
      } else {
        const size = stretchSize(cell, dx, dy, grid);
        onStretch(size.w, size.h);
      }
    }
    setDrag(null);
    start.current = null;
  };
  const touchStart = (event: GestureResponderEvent) => {
    start.current = at(event);
  };
  const grant = (kind: Drag["kind"], event: GestureResponderEvent) => {
    const here = start.current ?? at(event);
    setDrag({ kind, x0: here.x, y0: here.y, dx: 0, dy: 0 });
    if (!selected) {
      onSelect();
    }
  };

  // Where it would land now.
  const spot =
    drag?.kind === "move"
      ? dropSpot(cell, drag.dx, drag.dy, grid)
      : { col: cell.col, row: cell.row };
  const size =
    drag?.kind === "size"
      ? stretchSize(cell, drag.dx, drag.dy, grid)
      : { w: cell.w, h: cell.h };

  return (
    <>
      {drag !== null ? (
        <View
          pointerEvents="none"
          testID={`${testID}-landing`}
          style={[
            styles.landing,
            {
              left: left(spot.col),
              top: top(spot.row),
              width: width(size.w),
              height: height(size.h),
              borderColor: palette.accent,
            },
          ]}
        />
      ) : null}
      <View
        onStartShouldSetResponderCapture={(event) => {
          touchStart(event);
          return false;
        }}
        onMoveShouldSetResponderCapture={(event) => moved(event)}
        onResponderGrant={(event) => grant("move", event)}
        onResponderMove={(event) => follow(event)}
        onResponderRelease={(event) => finish(event)}
        onResponderTerminationRequest={() => false}
        onResponderTerminate={() => finish(null)}
        testID={`${testID}-drag`}
        style={[
          styles.cell,
          {
            left: left(cell.col),
            top: top(cell.row),
            width: drag?.kind === "size" ? width(size.w) : width(cell.w),
            height: drag?.kind === "size" ? height(size.h) : height(cell.h),
            zIndex: drag !== null ? 2 : selected ? 1 : 0,
            transform:
              drag?.kind === "move"
                ? [{ translateX: drag.dx }, { translateY: drag.dy }]
                : [],
            opacity: drag?.kind === "move" ? 0.85 : 1,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected }}
          onPress={onSelect}
          testID={testID}
          style={styles.fill}
        >
          {children}
        </Pressable>
        {selected ? (
          <View
            onStartShouldSetResponderCapture={(event) => {
              touchStart(event);
              return true;
            }}
            onMoveShouldSetResponderCapture={(event) => moved(event)}
            onResponderGrant={(event) => grant("size", event)}
            onResponderMove={(event) => follow(event)}
            onResponderRelease={(event) => finish(event)}
            onResponderTerminationRequest={() => false}
            onResponderTerminate={() => finish(null)}
            accessibilityLabel={t("Size")}
            testID={`${testID}-handle`}
            style={[
              styles.handle,
              { backgroundColor: palette.onAccent, borderColor: palette.accent },
            ]}
          />
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  cell: { position: "absolute" },
  fill: { flex: 1 },
  landing: {
    position: "absolute",
    borderWidth: 3,
    borderStyle: "dashed",
    borderRadius: 10,
  },
  handle: {
    position: "absolute",
    right: -HANDLE / 3,
    bottom: -HANDLE / 3,
    width: HANDLE,
    height: HANDLE,
    borderRadius: HANDLE / 2,
    borderWidth: 3,
  },
});
