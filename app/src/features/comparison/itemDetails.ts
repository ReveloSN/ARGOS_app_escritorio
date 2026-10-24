import type { TranslationKey } from "../../i18n/translate";
import type { ChangeKindValue, ChangeResult } from "../../services/engine/comparisonTypes";
import type { AlertResult, AlertSideResult } from "../../services/engine/reviewTypes";
import { alertTitle, describeLocation, type Translate } from "../alerts/alertPresentation";
import type { ExplainTarget } from "../explanation/explainTarget";
import { CHANGE_KIND_APPEARANCE, changeSegment, changeValues } from "./changePresentation";
import type { ItemDetailContent } from "./ItemDetail";
import { meaningLabel } from "./meaningLabel";

const CHANGE_TITLES: Readonly<Record<ChangeKindValue, TranslationKey>> = {
  removed: "comparison.detail.removedTitle",
  added: "comparison.detail.addedTitle",
  modified: "comparison.detail.modifiedTitle",
  moved: "comparison.detail.movedTitle",
};
const RISK_ICONS = { high: "report", medium: "warning", low: "info" } as const;

function changeHeading(change: ChangeResult, t: Translate) {
  const appearance = CHANGE_KIND_APPEARANCE[change.kind];
  const segment = changeSegment(change);
  return {
    number: change.number,
    icon: appearance.icon,
    kind: t(appearance.label),
    location: segment ? describeLocation(segment.location, t) : "",
    title: t(CHANGE_TITLES[change.kind]),
  };
}

export function changeDetail(
  change: ChangeResult,
  comparisonId: string,
  t: Translate,
): ItemDetailContent {
  const values = changeValues(change);
  return {
    ...changeHeading(change, t),
    values: [
      labeled(t("comparison.detail.inA"), values.before),
      labeled(t("comparison.detail.inB"), values.after),
    ],
    meaning: change.meaning ? meaningLabel(change.meaning, t) : undefined,
    explain: explainTarget(change, comparisonId, t),
  };
}

function labeled(label: string, value: string) {
  return { label, value };
}

/** El cambio a explicar y el fragmento citado como origen (el del documento nuevo si existe). */
function explainTarget(
  change: ChangeResult,
  comparisonId: string,
  t: Translate,
): ExplainTarget | undefined {
  const segment = changeSegment(change);
  if (!segment) return undefined;
  const source = `${segment.document} · ${describeLocation(segment.location, t)}`;
  const quotes = [{ text: segment.text, source }];
  return { subject: "change", comparisonId, number: change.number, quotes };
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
    values: alert.second ? [first, sideValue(alert.second, t("alerts.valueB"))] : [first],
  };
}
