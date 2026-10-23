import { Breadcrumb } from "../components/molecules/Breadcrumb";
import { ExportFeedback } from "../features/report/ExportFeedback";
import { reportDocument } from "../features/report/reportDocument";
import styles from "../features/report/Report.module.css";
import { ReportOptions } from "../features/report/ReportOptions";
import { ReportPreview } from "../features/report/ReportPreview";
import { useReportExport } from "../features/report/useReportExport";
import { useShortcuts } from "../features/keyboard/useShortcuts";
import { useI18n } from "../i18n/i18nContext";
import type { ReviewResult } from "../services/engine/reviewTypes";

interface ReportPageProps {
  readonly review: ReviewResult;
  readonly onBack: () => void;
}

/** «Informe exportable»: vista previa con los datos reales y exportación a PDF o DOCX. */
export function ReportPage({ review, onBack }: ReportPageProps) {
  const texts = useI18n();
  const report = useReportExport(review.session.id);
  const version = report.plan.status === "ready" ? report.plan.data.version : "";
  const document = reportDocument(
    { review, parts: report.parts, version, generatedAt: new Date() },
    texts,
  );
  const exportNow = () => {
    if (report.plan.status === "ready") report.exportReport(document);
  };
  useShortcuts([{ key: "e", withModifier: true, run: exportNow }]);
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Breadcrumb
          items={[
            { id: "case", label: review.session.name, onSelect: onBack },
            { id: "report", label: texts.t("report.crumb") },
          ]}
        />
        <h1 className={styles.title}>{texts.t("report.previewTitle")}</h1>
      </div>
      <div className={styles.workspace}>
        <div className={styles.previewColumn}>
          <ReportPreview document={document} />
        </div>
        <div className={styles.side}>
          <ReportOptions report={report} onExport={exportNow} />
          <ExportFeedback report={report} onRetry={exportNow} />
        </div>
      </div>
    </div>
  );
}
