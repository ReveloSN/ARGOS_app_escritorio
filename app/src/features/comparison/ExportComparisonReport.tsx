import { useState } from "react";

import { Button } from "../../components/atoms/Button";
import { useI18n } from "../../i18n/i18nContext";
import type { TranslationKey } from "../../i18n/translate";
import type { ReportFormatValue } from "../../services/engine/reportTypes";
import styles from "./Compare.module.css";
import type { ComparisonReportExport } from "./useComparisonReportExport";

const FORMATS: readonly { readonly format: ReportFormatValue; readonly label: TranslationKey }[] = [
  { format: "pdf", label: "comparison.report.pdf" },
  { format: "docx", label: "comparison.report.docx" },
];

/** «Exportar informe»: se elige PDF o Word y el informe se guarda en Documentos/ARGUS. */
export function ExportComparisonReport({ report }: { readonly report: ComparisonReportExport }) {
  const { t } = useI18n();
  const [isChoosing, setIsChoosing] = useState(false);
  const isExporting = report.status.kind === "exporting";
  if (isChoosing) {
    return (
      <div
        role="group"
        aria-label={t("comparison.report.formatLabel")}
        className={styles.exportFormats}
      >
        {FORMATS.map((item) => (
          <Button
            key={item.format}
            size="md"
            onClick={() => {
              setIsChoosing(false);
              report.export(item.format);
            }}
          >
            {t(item.label)}
          </Button>
        ))}
      </div>
    );
  }
  return (
    <Button
      size="md"
      icon="description"
      disabled={isExporting}
      onClick={() => {
        setIsChoosing(true);
      }}
    >
      {t(isExporting ? "comparison.report.exporting" : "comparison.report.action")}
    </Button>
  );
}
