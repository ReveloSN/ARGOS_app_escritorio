import type { TranslationKey } from "../../i18n/translate";
import type {
  ChangeKindValue,
  ChangeResult,
  PairComparisonResult,
} from "../../services/engine/comparisonTypes";
import type { AlertResult, AlertSideResult } from "../../services/engine/reviewTypes";
import { alertTitle, describeLocation, type Translate } from "../alerts/alertPresentation";
import { changeBlocks } from "../explanation/explanationBlocks";
import type { ExplainTarget } from "../explanation/explainTarget";
import { changeSideValues } from "../explanation/sideValues";
import { CHANGE_KIND_APPEARANCE, changeSegment } from "./changePresentation";
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

/** Lo que hace falta para detallar un cambio: él, su par de documentos y la comparación. */
export interface ChangeSource {
  readonly change: ChangeResult;
  readonly pair: PairComparisonResult;
  readonly comparisonId: string;
}

export function changeDetail(source: ChangeSource, t: Translate): ItemDetailContent {
  return {
    ...changeHeading(source.change, t),
    values: [],
    explain: explainTarget(source, t),
  };
}

/** El cambio a explicar y el fragmento citado como origen (el del documento nuevo si existe). */
function explainTarget({ change, pair, comparisonId }: ChangeSource, t: Translate): ExplainTarget {
  const segment = changeSegment(change);
  const quotes = segment
    ? [
        {
          text: segment.text,
          source: `${segment.document} · ${describeLocation(segment.location, t)}`,
        },
      ]
    : [];
  return {
    subject: "change",
    comparisonId,
    number: change.number,
    quotes,
    blocks: changeBlocks(change, t),
    meaning: change.meaning ? meaningLabel(change.meaning, t) : undefined,
    values: changeSideValues(change, pair),
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
    values: alert.second ? [first, sideValue(alert.second, t("alerts.valueB"))] : [first],
  };
}
