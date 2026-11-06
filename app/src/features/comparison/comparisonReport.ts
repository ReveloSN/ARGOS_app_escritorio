import type { ComparisonResult } from "../../services/engine/comparisonTypes";
import type { ReportDocumentData } from "../../services/engine/reportTypes";
import type { TranslationKey } from "../../i18n/translate";
import type { ReportTexts } from "../report/reportSections";
import { allChanges, changesSection, inconsistenciesSection } from "./comparisonReportTables";

type ReportSection = ReportDocumentData["sections"][number];

export interface ComparisonReportRequest {
  readonly comparison: ComparisonResult;
  readonly version: string;
  readonly generatedAt: Date;
}

const NO_TABLE = { paragraphs: [], metrics: [], table: null } as const;

function summaryMetrics(comparison: ComparisonResult, { tPlural }: ReportTexts) {
  const changes = allChanges(comparison);
  const metric = (key: Parameters<typeof tPlural>[0]["key"], count: number) => ({
    value: String(count),
    label: tPlural({ key, count }),
  });
  return [
    metric("comparison.report.metrics.changes", changes.length),
    metric("comparison.report.metrics.high", changes.filter((item) => item.risk === "high").length),
    metric("comparison.report.metrics.inconsistencies", comparison.inconsistencies.length),
    metric("comparison.report.metrics.decided", comparison.decisions.decisions.length),
  ];
}

function summarySection(
  comparison: ComparisonResult,
  heading: string,
  texts: ReportTexts,
): ReportSection {
  const { tPlural, format } = texts;
  const documents = comparison.documents.filter((document) => document.status === "read").length;
  const date = format.date(new Date(comparison.createdAt));
  const paragraph = tPlural({
    key: "comparison.report.summary",
    count: documents,
    params: { date },
  });
  return {
    ...NO_TABLE,
    heading,
    metrics: summaryMetrics(comparison, texts),
    paragraphs: [paragraph],
  };
}

type Builder = (comparison: ComparisonResult, heading: string, texts: ReportTexts) => ReportSection;

function partsOf(comparison: ComparisonResult) {
  const parts: { readonly title: TranslationKey; readonly build: Builder }[] = [
    { title: "comparison.report.parts.summary", build: summarySection },
  ];
  if (allChanges(comparison).length) {
    parts.push({ title: "comparison.report.parts.changes", build: changesSection });
  }
  if (comparison.inconsistencies.length) {
    parts.push({ title: "comparison.report.parts.inconsistencies", build: inconsistenciesSection });
  }
  return parts;
}

function sectionsOf(comparison: ComparisonResult, texts: ReportTexts): ReportSection[] {
  const { t } = texts;
  return partsOf(comparison).map((part, index) => {
    const heading = t("comparison.report.heading", { number: index + 1, title: t(part.title) });
    return part.build(comparison, heading, texts);
  });
}

/**
 * El informe de una comparación redactado en el idioma de la interfaz con los datos reales del
 * motor; el motor solo lo maqueta en PDF o DOCX (ADR 023).
 */
export function comparisonReportDocument(
  { comparison, version, generatedAt }: ComparisonReportRequest,
  texts: ReportTexts,
): ReportDocumentData {
  const { t, format } = texts;
  const comparedOn = format.date(new Date(comparison.createdAt));
  return {
    title: t("comparison.report.title"),
    subtitles: [comparison.name, t("comparison.report.comparedOn", { date: comparedOn })],
    brand: t("app.name"),
    sections: sectionsOf(comparison, texts),
    footer: t("report.footer", { version, date: format.dateTime(generatedAt) }),
    pageLabel: t("report.pageLabel"),
  };
}
