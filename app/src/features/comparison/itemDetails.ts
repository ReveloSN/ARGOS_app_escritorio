import type { TranslationKey } from "../../i18n/translate";
import type { ChangeKindValue, ChangeResult } from "../../services/engine/comparisonTypes";
import type { AlertResult, AlertSideResult } from "../../services/engine/reviewTypes";
import { alertTitle, describeLocation, type Translate } from "../alerts/alertPresentation";
import { CHANGE_KIND_APPEARANCE, changeSegment, changeValues } from "./changePresentation";
import type { ItemDetailContent } from "./ItemDetail";

const CHANGE_TITLES: Readonly<Record<ChangeKindValue, TranslationKey>> = {
  removed: "comparison.detail.removedTitle",
  added: "comparison.detail.addedTitle",
  modified: "comparison.detail.modifiedTitle",
  moved: "comparison.detail.movedTitle",
};
const RISK_ICONS = { high: "report", medium: "warning", low: "info" } as const;

export function changeDetail(change: ChangeResult, t: Translate): ItemDetailContent {
  const appearance = CHANGE_KIND_APPEARANCE[change.kind];
  const segment = changeSegment(change);
  const values = changeValues(change);
  return {
    number: change.number,
    icon: appearance.icon,
    kind: t(appearance.label),
    location: segment ? describeLocation(segment.location, t) : "",
    title: t(CHANGE_TITLES[change.kind]),
    values: [
      { label: t("comparison.detail.inA"), value: values.before },
      { label: t("comparison.detail.inB"), value: values.after },
    ],
  };
}

function sideValue(side: AlertSideResult, fallback: string) {
  return { label: side.occurrences[0]?.document ?? fallback, value: side.value };
}

export function inconsistencyDetail(alert: AlertResult, t: Translate): ItemDetailContent {
  const first = sideValue(alert.first, t("alerts.valueA"));
  return {
    number: alert.number,
    icon: RISK_ICONS[alert.risk],
    kind: t(`risk.${alert.risk}Long`),
    location: first.label,
    title: alertTitle(alert, t),
    values: [first, sideValue(alert.second, t("alerts.valueB"))],
  };
}
