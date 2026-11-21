import type { I18n } from "../../i18n/i18nContext";
import type { ReportCellData, ReportSectionData } from "../../services/engine/reportTypes";
import type {
  AlertResult,
  AlertSideResult,
  DecisionResult,
  ReviewResult,
} from "../../services/engine/reviewTypes";
import { decisionStateOf } from "../alerts/alertDecisions";
import { describeLocation, entityTypeLabel } from "../alerts/alertPresentation";
import { NO_SECOND_VALUE } from "../alerts/alertSides";
import { riskParagraph } from "./reportRisk";

export type ReportTexts = Pick<I18n, "t" | "tPlural" | "format" | "locale">;

const EMPTY_SECTION = { paragraphs: [], metrics: [], table: null } as const;

export function sideCell(side: AlertSideResult | null, { t }: ReportTexts): ReportCellData {
  const first = side?.occurrences[0];
  if (!side || !first) return { text: NO_SECOND_VALUE };
  return { text: side.value, detail: `${first.document} · ${describeLocation(first.location, t)}` };
}

function dataLabels(alerts: readonly AlertResult[], texts: ReportTexts): string {
  const labels = alerts.map((alert) =>
    entityTypeLabel(alert.entityType, texts.t).toLocaleLowerCase(texts.locale),
  );
  return texts.format.list([...new Set(labels)]);
}

function countBy(review: ReviewResult, state: string): AlertResult[] {
  return review.alerts.filter((alert) => decisionStateOf(review, alert.number) === state);
}

function summaryParagraph(review: ReviewResult, texts: ReportTexts): string {
  const { t, tPlural } = texts;
  const read = review.documents.filter((document) => document.status === "read").length;
  const date = texts.format.date(new Date(review.session.createdAt));
  const parts = [tPlural({ key: "report.summary.documents", count: read, params: { date } })];
  const errors = countBy(review, "error");
  const pending = countBy(review, "pending");
  if (errors.length) parts.push(t("report.summary.errors", { data: dataLabels(errors, texts) }));
  if (pending.length) parts.push(t("report.summary.pending", { data: dataLabels(pending, texts) }));
  return parts.join(" ");
}

/** Qué se revisó y qué queda; con alertas, también su reparto por riesgo. */
function summaryParagraphs(review: ReviewResult, texts: ReportTexts): string[] {
  const paragraphs = [summaryParagraph(review, texts)];
  if (review.alerts.length > 0) paragraphs.push(riskParagraph(review, texts));
  return paragraphs;
}

/** «Resumen»: cuántas alertas hubo y cómo se decidieron, con una frase de lo que queda. */
export function summarySection(
  review: ReviewResult,
  heading: string,
  texts: ReportTexts,
): ReportSectionData {
  const { tPlural } = texts;
  const metric = (key: Parameters<typeof tPlural>[0]["key"], count: number) => ({
    value: String(count),
    label: tPlural({ key, count }),
  });
  const metrics = [
    metric("report.metrics.alerts", review.alerts.length),
    metric("report.metrics.errors", countBy(review, "error").length),
    metric("report.metrics.correct", countBy(review, "correct").length),
    metric("report.metrics.ignored", countBy(review, "ignored").length),
    metric("report.metrics.pending", countBy(review, "pending").length),
  ];
  return { ...EMPTY_SECTION, heading, metrics, paragraphs: summaryParagraphs(review, texts) };
}

// Número y riesgo primero: el informe se lee en el mismo orden que la lista de alertas.
const EVIDENCE_COLUMNS = [
  "report.evidence.number",
  "report.evidence.risk",
  "report.evidence.data",
  "report.evidence.valueA",
  "report.evidence.valueB",
] as const;

/** «Evidencia»: cada valor con su archivo y su ubicación (CLAUDE.md §7). */
export function evidenceSection(
  review: ReviewResult,
  heading: string,
  texts: ReportTexts,
): ReportSectionData {
  const { t } = texts;
  const columns = EVIDENCE_COLUMNS.map((key) => t(key));
  const rows = review.alerts.map((alert) => [
    { text: String(alert.number) },
    { text: t(`risk.${alert.risk}`) },
    { text: entityTypeLabel(alert.entityType, t) },
    sideCell(alert.first, texts),
    sideCell(alert.second, texts),
  ]);
  return { ...EMPTY_SECTION, heading, table: { columns, rows } };
}

/** «Valor correcto: 1234» con su origen (§7): la sección de decisiones puede ir sin «Evidencia». */
function decisionNote(
  alert: AlertResult,
  decision: DecisionResult,
  texts: ReportTexts,
): ReportCellData {
  const side = decision.correctSide === "first" ? alert.first : alert.second;
  if (!decision.correctSide || !side) return { text: "" };
  const { detail } = sideCell(side, texts);
  const text = texts.t("decisionCard.correctValue", { value: side.value });
  return detail ? { text, detail } : { text };
}

function decisionRow(
  alert: AlertResult,
  decision: DecisionResult,
  texts: ReportTexts,
): ReportCellData[] {
  const { t, format } = texts;
  return [
    { text: String(alert.number) },
    { text: entityTypeLabel(alert.entityType, t) },
    { text: t(`decision.${decision.kind}`) },
    decisionNote(alert, decision, texts),
    { text: format.dateTime(new Date(decision.decidedAt)) },
  ];
}

/** «Decisiones tomadas»: qué se decidió en cada alerta, cuándo y el valor correcto si se dijo. */
export function decisionsSection(
  review: ReviewResult,
  heading: string,
  texts: ReportTexts,
): ReportSectionData {
  const { t } = texts;
  const columns = [
    t("report.evidence.number"),
    t("report.evidence.data"),
    t("report.decisions.decision"),
    t("report.decisions.note"),
    t("report.decisions.when"),
  ];
  const rows = review.decisions.decisions.flatMap((decision) => {
    const alert = review.alerts.find((item) => item.number === decision.alertNumber);
    return alert ? [decisionRow(alert, decision, texts)] : [];
  });
  return { ...EMPTY_SECTION, heading, table: { columns, rows } };
}

export function aiNoteSection(heading: string, { t }: ReportTexts): ReportSectionData {
  return { ...EMPTY_SECTION, heading, paragraphs: [t("report.aiNote")] };
}
