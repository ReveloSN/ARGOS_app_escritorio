import styles from "./MetricsStrip.module.css";

export interface MetricView {
  readonly id: string;
  readonly label: string;
  /** Valor ya formateado («214», «6 min 40 s», «31 %») o «—» si aún no hay datos. */
  readonly value: string;
  readonly detail: string;
}

interface MetricsStripProps {
  readonly label: string;
  readonly metrics: readonly MetricView[];
}

/** Métricas de uso del historial (CLAUDE.md §10): eficacia y eficiencia de las revisiones. */
export function MetricsStrip({ label, metrics }: MetricsStripProps) {
  return (
    <dl aria-label={label} className={styles.strip}>
      {metrics.map((metric) => (
        <div key={metric.id} className={styles.metric}>
          <dt className={styles.label}>{metric.label}</dt>
          <dd className={styles.value}>{metric.value}</dd>
          <dd className={styles.detail}>{metric.detail}</dd>
        </div>
      ))}
    </dl>
  );
}
