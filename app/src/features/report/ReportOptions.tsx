import { Button } from "../../components/atoms/Button";
import { Checkbox } from "../../components/atoms/Checkbox";
import { joinClassNames } from "../../components/joinClassNames";
import { useI18n } from "../../i18n/i18nContext";
import type { ReportFormatValue } from "../../services/engine/reportTypes";
import { REPORT_PARTS } from "./reportDocument";
import styles from "./Report.module.css";
import { EXPORT_SHORTCUT, type ReportExport } from "./useReportExport";

const FORMATS: readonly ReportFormatValue[] = ["pdf", "docx"];

interface ReportOptionsProps {
  readonly report: ReportExport;
  readonly onExport: () => void;
}

function FormatChooser({ report }: { report: ReportExport }) {
  const { t } = useI18n();
  return (
    <div role="radiogroup" aria-label={t("report.options.format")} className={styles.formats}>
      {FORMATS.map((format) => (
        <button
          key={format}
          type="button"
          role="radio"
          aria-checked={report.format === format}
          className={joinClassNames(styles.format, report.format === format && styles.formatOn)}
          onClick={() => {
            report.setFormat(format);
          }}
        >
          {t(`report.formats.${format}`)}
        </button>
      ))}
    </div>
  );
}

/** Formato, secciones a incluir, carpeta de destino y «Exportar» (Ctrl E). */
export function ReportOptions({ report, onExport }: ReportOptionsProps) {
  const { t } = useI18n();
  const plan = report.plan.status === "ready" ? report.plan.data : null;
  return (
    <aside className={styles.options} aria-label={t("report.options.label")}>
      <span className={styles.optionsTitle}>{t("report.options.format")}</span>
      <FormatChooser report={report} />
      <span className={styles.optionsTitle}>{t("report.options.include")}</span>
      {REPORT_PARTS.map((part) => (
        <div key={part} className={styles.part}>
          <Checkbox
            label={t(`report.parts.${part}`)}
            checked={report.parts.has(part)}
            onChange={() => {
              report.toggle(part);
            }}
          />
          <span className={styles.partHint}>{t(`report.hints.${part}`)}</span>
        </div>
      ))}
      <span className={styles.optionsTitle}>{t("report.options.saveIn")}</span>
      <span className={styles.folder}>{plan?.folder ?? t("report.options.locating")}</span>
      <Button
        variant="primary"
        size="md"
        shortcut={EXPORT_SHORTCUT}
        disabled={!plan || report.status.kind === "exporting"}
        onClick={onExport}
      >
        {t("report.options.export", { format: t(`report.formats.${report.format}`) })}
      </Button>
      {plan && <span className={styles.fileName}>{`${plan.fileName}.${report.format}`}</span>}
    </aside>
  );
}
