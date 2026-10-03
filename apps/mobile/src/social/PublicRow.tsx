import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { type DrawingChoice, titleOf } from "../api/drawings";
import { space } from "../theme/tokens";
import { type ChoiceShown, useDrawingsDoor } from "./drawingsDoor";
import {
  DrawingTitle,
  PUBLIC_ON_CARD,
  PublicLine,
  PublicSwitch,
  waitingText,
} from "./PublicParts";

type Line = { text: string; alert: boolean };

/**
 * «Public» and the title on a run of «My activities» (TASK-117), on its
 * card: to publish it after the end of the run, change its title, or take
 * it back. Nothing until the API says what was chosen; nothing at all from
 * an API without drawings. Without a network the choice waits on the
 * phone, and says so.
 */
export function PublicRow({ activityKey }: { activityKey: string }) {
  const { choiceOf, choose } = useDrawingsDoor();
  const [shown, setShown] = useState<ChoiceShown | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(0);
  const [line, setLine] = useState<Line | null>(null);
  // One choice at a time, in the order made: the last one is the run's.
  const queue = useRef<Promise<void>>(Promise.resolve());
  const live = useRef(true);

  useEffect(() => {
    live.current = true;
    void choiceOf(activityKey).then((answer) => {
      if (!live.current || answer === null) {
        return;
      }
      setShown(answer);
      if (answer.kind === "known") {
        setTitle(answer.choice.title ?? "");
        setLine(
          answer.waiting
            ? { text: waitingText(answer.choice.public), alert: false }
            : null,
        );
      }
    });
    return () => {
      live.current = false;
    };
  }, [activityKey, choiceOf]);

  if (shown === null || shown.kind === "off") {
    return null;
  }
  if (shown.kind === "failed") {
    return (
      <View style={styles.block}>
        <PublicLine text={shown.problem} alert />
      </View>
    );
  }
  const { choice } = shown;

  function apply(next: DrawingChoice) {
    setBusy((n) => n + 1);
    setLine(null);
    queue.current = queue.current.then(async () => {
      const chosen = await choose(activityKey, next);
      if (!live.current) {
        return;
      }
      setBusy((n) => n - 1);
      if (chosen === null) {
        return;
      }
      switch (chosen.kind) {
        case "saved": {
          const kept = { title: chosen.drawing.title, public: chosen.drawing.public };
          setShown({ kind: "known", choice: kept, waiting: false });
          setTitle(kept.title ?? "");
          return;
        }
        case "waiting":
          setShown({ kind: "known", choice: next, waiting: true });
          setLine({ text: waitingText(next.public), alert: false });
          return;
        case "failed":
          setLine({ text: chosen.problem, alert: true });
      }
    });
  }

  function onTitleDone() {
    const typed = titleOf(title);
    if (typed !== choice.title) {
      apply({ title: typed, public: choice.public });
    }
  }

  return (
    <View style={styles.block}>
      <PublicSwitch
        on={choice.public}
        disabled={busy > 0}
        onChange={(on) => apply({ title: titleOf(title), public: on })}
      />
      <DrawingTitle value={title} onChange={setTitle} onDone={onTitleDone} />
      {line !== null ? (
        <PublicLine text={line.text} alert={line.alert} />
      ) : (
        choice.public && <PublicLine text={PUBLIC_ON_CARD} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: space.sm,
    paddingTop: space.xs,
  },
});
