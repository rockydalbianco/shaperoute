import { useEffect, useMemo, useRef, useState } from "react";

import { subscribeLanguage } from "../i18n/language";
import { appMorning, onMorningTapped, syncMorningNotices } from "./morning";
import { type Minutes, routineExercises } from "./routines";
import { StretchScreen } from "./StretchScreen";

type Props = {
  /** A run is on: its screen keeps the phone awake and is not covered. */
  blocked?: boolean;
};

/**
 * The morning stretching over the app (TASK-466 part D, ADR-0378): a touch
 * on the notification of «Morning stretch» opens the «Morning» routine of
 * the length it carries, at once, without asking how long. Not during a
 * run. With the setting on, the phone's notifications are set again as the
 * app opens and at each new language: their words are written when they
 * are scheduled.
 */
export function MorningStretchLayer({ blocked = false }: Props) {
  const [minutes, setMinutes] = useState<Minutes | null>(null);
  const busy = useRef(blocked);
  useEffect(() => {
    busy.current = blocked;
  }, [blocked]);

  useEffect(
    () =>
      onMorningTapped((asked) => {
        if (!busy.current) {
          setMinutes(asked);
        }
      }),
    [],
  );

  useEffect(() => {
    const again = () => {
      const setting = appMorning();
      if (setting.on) {
        void syncMorningNotices(setting);
      }
    };
    again();
    return subscribeLanguage(again);
  }, []);

  const exercises = useMemo(
    () => (minutes === null ? null : routineExercises("morning", minutes)),
    [minutes],
  );
  if (exercises === null) {
    return null;
  }
  return (
    <StretchScreen
      routine="morning"
      exercises={exercises}
      onLeave={() => setMinutes(null)}
    />
  );
}
