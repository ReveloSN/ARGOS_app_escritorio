import type { Translate } from "../alerts/alertPresentation";

const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

/** «6 min 40 s», «45 s» o «1 h 5 min»: el tiempo medio de revisión del historial. */
export function formatDuration(totalSeconds: number, t: Translate): string {
  const seconds = Math.round(totalSeconds);
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  if (minutes === 0) return t("duration.seconds", { seconds });
  if (minutes < MINUTES_PER_HOUR) {
    return t("duration.minutesSeconds", { minutes, seconds: seconds % SECONDS_PER_MINUTE });
  }
  return t("duration.hoursMinutes", {
    hours: Math.floor(minutes / MINUTES_PER_HOUR),
    minutes: minutes % MINUTES_PER_HOUR,
  });
}
