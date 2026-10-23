import type { TranslationKey } from "../../i18n/translate";
import type { ReportDocumentData, ReportSectionData } from "../../services/engine/reportTypes";
import type { ReviewResult } from "../../services/engine/reviewTypes";
import {
  aiNoteSection,
  decisionsSection,
  evidenceSection,
  summarySection,
  type ReportTexts,
} from "./reportSections";

export type ReportPart = "summary" | "evidence" | "decisions" | "ai";

export const REPORT_PARTS: readonly ReportPart[] = ["summary", "evidence", "decisions", "ai"];

type SectionBuilder = (
  review: ReviewResult,
  heading: string,
  texts: ReportTexts,
) => ReportSectionData;

const BUILDERS: Readonly<Record<ReportPart, SectionBuilder>> = {
  summary: summarySection,
  evidence: evidenceSection,
  decisions: decisionsSection,
  ai: (_review, heading, texts) => aiNoteSection(heading, texts),
};

const HEADINGS: Readonly<Record<ReportPart, TranslationKey>> = {
  summary: "report.parts.summary",
  evidence: "report.parts.evidence",
  decisions: "report.parts.decisions",
  ai: "report.parts.ai",
};

export interface ReportRequest {
  readonly review: ReviewResult;
  readonly parts: ReadonlySet<ReportPart>;
  readonly version: string;
  readonly generatedAt: Date;
}

/**
 * El informe redactado en el idioma de la interfaz con los datos reales de la revisión; la
 * vista previa y el archivo exportado salen del mismo contenido.
 */
function sectionsOf(request: ReportRequest, texts: ReportTexts): ReportSectionData[] {
  const { t } = texts;
  const chosen = REPORT_PARTS.filter((part) => request.parts.has(part));
  return chosen.map((part, index) => {
    const heading = t("report.heading", { number: index + 1, title: t(HEADINGS[part]) });
    return BUILDERS[part](request.review, heading, texts);
  });
}

export function reportDocument(request: ReportRequest, texts: ReportTexts): ReportDocumentData {
  const { t, format } = texts;
  const reviewedOn = format.date(new Date(request.review.session.createdAt));
  const generatedAt = format.dateTime(request.generatedAt);
  return {
    title: t("report.title"),
    subtitles: [request.review.session.name, t("report.reviewedOn", { date: reviewedOn })],
    brand: t("app.name"),
    sections: sectionsOf(request, texts),
    footer: t("report.footer", { version: request.version, date: generatedAt }),
    pageLabel: t("report.pageLabel"),
  };
}
