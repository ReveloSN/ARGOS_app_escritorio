import { useI18n } from "../../i18n/i18nContext";
import { DecisionTag, type DecisionState } from "../atoms/DecisionTag";
import { RiskTag, type RiskLevel } from "../atoms/RiskTag";
import { SourceLine } from "../molecules/SourceLine";
import styles from "./DecisionCard.module.css";

/** Dónde aparece un valor: archivo y lugar ya traducido («Página 2», «Línea 4»). */
export interface ValueSource {
  readonly fileName: string;
  readonly location: string;
}

export interface DecisionCardData {
  readonly number: number;
  readonly risk: RiskLevel;
  readonly typeLabel: string;
  readonly title: string;
  readonly valueA: string;
  readonly valueB: string;
  readonly decision: DecisionState;
  /** Cuándo se decidió, ya formateado. */
  readonly decidedAt: string;
  /** «Valor correcto: 4857», si se indicó. */
  readonly note?: string | undefined;
  /** Origen de cada valor (CLAUDE.md §7); el B falta en las verificaciones de un solo dato. */
  readonly sourceA?: ValueSource | undefined;
  readonly sourceB?: ValueSource | undefined;
}

/** El valor y, debajo, dónde aparece. */
function ValueWithSource({ value, source }: { value: string; source?: ValueSource | undefined }) {
  return (
    <dd>
      <span className={styles.value}>{value}</span>
      {source && <SourceLine fileName={source.fileName} location={source.location} />}
    </dd>
  );
}

interface DecisionCardProps {
  readonly data: DecisionCardData;
  readonly onOpen?: (() => void) | undefined;
}

/** Una decisión del historial: la alerta, sus dos valores y lo que se decidió. */
export function DecisionCard({ data, onOpen }: DecisionCardProps) {
  const { t } = useI18n();
  return (
    <article className={styles.card}>
      <div className={styles.tags}>
        <RiskTag level={data.risk} compact />
        <span className={styles.type}>{data.typeLabel}</span>
      </div>
      {onOpen ? (
        <button type="button" className={styles.titleLink} onClick={onOpen}>
          {data.title}
        </button>
      ) : (
        <span className={styles.title}>{data.title}</span>
      )}
      <dl className={styles.values}>
        <dt>{t("decisionCard.valueA")}</dt>
        <ValueWithSource value={data.valueA} source={data.sourceA} />
        <dt>{t("decisionCard.valueB")}</dt>
        <ValueWithSource value={data.valueB} source={data.sourceB} />
      </dl>
      <div className={styles.decision}>
        <DecisionTag state={data.decision} />
        <span>{data.decidedAt}</span>
      </div>
      {data.note && <span className={styles.note}>{data.note}</span>}
    </article>
  );
}
