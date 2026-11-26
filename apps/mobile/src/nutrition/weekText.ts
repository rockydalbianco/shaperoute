import { MONTHS } from "../activities/activityText";
import { t } from "../i18n";
import type { LocalDay } from "./localDay";

/** «16 Nov»: a day with its month, as the profile writes a day. */
function dayAndMonth(day: LocalDay): string {
  const [, month, date] = day.split("-").map(Number);
  return t("{day} {month}", { day: String(date), month: t(MONTHS[month - 1]) });
}

/** «This week» for the week of `today`, else «16 Nov – 22 Nov»: the name
 * of a week on the profile's card and under the diary. */
export function weekLabel(days: readonly LocalDay[], today: LocalDay): string {
  return days.includes(today)
    ? t("This week")
    : `${dayAndMonth(days[0])} – ${dayAndMonth(days[days.length - 1])}`;
}
