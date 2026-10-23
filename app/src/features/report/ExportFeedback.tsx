import { useState } from "react";

import { Button } from "../../components/atoms/Button";
import { ErrorMessage } from "../../components/molecules/ErrorMessage";
import { useI18n } from "../../i18n/i18nContext";
import styles from "./Report.module.css";
import type { ReportExport } from "./useReportExport";

interface ExportFeedbackProps {
  readonly report: ReportExport;
  readonly onRetry: () => void;
}

function Saved({
  report,
  fileName,
  folder,
}: {
  report: ReportExport;
  fileName: string;
  folder: string;
}) {
  const { t } = useI18n();
  const [hasOpenFailed, setHasOpenFailed] = useState(false);
  const open = () => {
    setHasOpenFailed(false);
    report.open(fileName).catch(() => {
      setHasOpenFailed(true);
    });
  };
  return (
    <div role="status" className={styles.saved}>
      <span>{t("report.saved", { name: fileName, folder })}</span>
      <Button size="md" icon="open_in_new" onClick={open}>
        {t("report.open")}
      </Button>
      {hasOpenFailed && <span className={styles.openFailed}>{t("report.openFailed")}</span>}
    </div>
  );
}

/** Tras exportar: dónde quedó el informe con «Abrir informe», o por qué no se guardó. */
export function ExportFeedback({ report, onRetry }: ExportFeedbackProps) {
  const { t } = useI18n();
  const { status } = report;
  if (status.kind === "saved") {
    return (
      <Saved report={report} fileName={status.location.fileName} folder={status.location.folder} />
    );
  }
  if (status.kind !== "failed") return null;
  return (
    <ErrorMessage
      tone="neutral"
      icon="save"
      what={t("report.failed.what")}
      why={t("report.failed.why")}
      todo={t("report.failed.todo")}
      primaryAction={{ label: t("report.failed.retry"), onClick: onRetry }}
    />
  );
}
