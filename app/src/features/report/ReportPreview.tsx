import { ArgusEye } from "../../components/atoms/ArgusEye";
import { useI18n } from "../../i18n/i18nContext";
import type {
  ReportDocumentData,
  ReportSectionData,
  ReportTableData,
} from "../../services/engine/reportTypes";
import styles from "./Report.module.css";

function PreviewTable({ table }: { table: ReportTableData }) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          {table.columns.map((column) => (
            <th key={column}>{column}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex}>
                <span className={cell.detail ? styles.cellValue : styles.cellText}>
                  {cell.text}
                </span>
                {cell.detail && <span className={styles.cellDetail}>{cell.detail}</span>}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PreviewSection({ section }: { section: ReportSectionData }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionHeading}>{section.heading}</h2>
      {section.metrics.length > 0 && (
        <div className={styles.metrics}>
          {section.metrics.map((metric) => (
            <div key={metric.label} className={styles.metric}>
              <span className={styles.metricValue}>{metric.value}</span>
              <span className={styles.metricLabel}>{metric.label}</span>
            </div>
          ))}
        </div>
      )}
      {section.paragraphs.map((text) => (
        <p key={text} className={styles.paragraph}>
          {text}
        </p>
      ))}
      {section.table && <PreviewTable table={section.table} />}
    </section>
  );
}

/** Vista previa del informe: el mismo contenido que se exporta, sobre una hoja (mockup Informe). */
export function ReportPreview({ document }: { document: ReportDocumentData }) {
  const { t } = useI18n();
  return (
    <article className={styles.sheet} aria-label={t("report.previewLabel")}>
      <header className={styles.sheetHeader}>
        <div className={styles.titles}>
          <span className={styles.sheetTitle}>{document.title}</span>
          {document.subtitles.map((line) => (
            <span key={line} className={styles.subtitle}>
              {line}
            </span>
          ))}
        </div>
        <span className={styles.brand}>
          <ArgusEye state="logo" size="sm" />
          {document.brand}
        </span>
      </header>
      {document.sections.map((section) => (
        <PreviewSection key={section.heading} section={section} />
      ))}
      <footer className={styles.sheetFooter}>{document.footer}</footer>
    </article>
  );
}
