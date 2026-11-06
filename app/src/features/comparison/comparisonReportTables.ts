import type {
  ChangeResult,
  ComparisonResult,
  SegmentResult,
} from "../../services/engine/comparisonTypes";
import type { ReportCellData, ReportDocumentData } from "../../services/engine/reportTypes";
import { describeSegmentLocation, entityTypeLabel } from "../alerts/alertPresentation";
import { NO_SECOND_VALUE } from "../alerts/alertSides";
import { sideCell, type ReportTexts } from "../report/reportSections";
import { CHANGE_KIND_APPEARANCE, changeValues } from "./changePresentation";

type ReportSection = ReportDocumentData["sections"][number];

const NO_TABLE = { paragraphs: [], metrics: [], table: null } as const;

export function allChanges(comparison: ComparisonResult): ChangeResult[] {
  return comparison.pairs.flatMap((pair) => [...pair.changes]);
}

function decisionText(comparison: ComparisonResult, number: number, { t }: ReportTexts): string {
  const decision = comparison.decisions.decisions.find((item) => item.alertNumber === number);
  return t(decision ? `decision.${decision.kind}` : "decision.pending");
}

function segmentCell(
  text: string,
  segment: SegmentResult | null,
  { t }: ReportTexts,
): ReportCellData {
  if (!segment || !text) return { text: NO_SECOND_VALUE };
  return { text, detail: `${segment.document} · ${describeSegmentLocation(segment, t)}` };
}

function changeRow(
  comparison: ComparisonResult,
  change: ChangeResult,
  texts: ReportTexts,
): ReportCellData[] {
  const { t } = texts;
  const values = changeValues(change);
  return [
    { text: t(CHANGE_KIND_APPEARANCE[change.kind].label), detail: t(`risk.${change.risk}Long`) },
    segmentCell(values.before, change.first, texts),
    segmentCell(values.after, change.second, texts),
    { text: decisionText(comparison, change.number, texts) },
  ];
}

export function changesSection(
  comparison: ComparisonResult,
  heading: string,
  texts: ReportTexts,
): ReportSection {
  const { t } = texts;
  const columns = [
    t("comparison.report.columns.change"),
    t("comparison.report.columns.before"),
    t("comparison.report.columns.after"),
    t("comparison.report.columns.decision"),
  ];
  const rows = allChanges(comparison).map((change) => changeRow(comparison, change, texts));
  return { ...NO_TABLE, heading, table: { columns, rows } };
}

export function inconsistenciesSection(
  comparison: ComparisonResult,
  heading: string,
  texts: ReportTexts,
): ReportSection {
  const { t } = texts;
  const columns = [
    t("comparison.report.columns.data"),
    t("report.evidence.valueA"),
    t("report.evidence.valueB"),
    t("comparison.report.columns.decision"),
  ];
  const rows = comparison.inconsistencies.map((alert, index) => [
    { text: entityTypeLabel(alert.entityType, t) },
    sideCell(alert.first, texts),
    sideCell(alert.second, texts),
    { text: decisionText(comparison, firstInconsistencyNumber(comparison) + index, texts) },
  ]);
  return { ...NO_TABLE, heading, table: { columns, rows } };
}

/** Las inconsistencias siguen en la numeración al último cambio (ADR 021). */
function firstInconsistencyNumber(comparison: ComparisonResult): number {
  return allChanges(comparison).length + 1;
}
