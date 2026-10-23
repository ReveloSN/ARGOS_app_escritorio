import { Button } from "../../components/atoms/Button";
import { RiskTag } from "../../components/atoms/RiskTag";
import { useI18n } from "../../i18n/i18nContext";
import type { ComparisonResult } from "../../services/engine/comparisonTypes";
import { changeValues } from "./changePresentation";
import styles from "./Compare.module.css";

// Las primeras diferencias de riesgo alto o medio dan una idea del par sin abrirlo.
const PAIR_ROWS_SHOWN = 4;

interface MatrixPairPanelProps {
  readonly comparison: ComparisonResult;
  readonly pairIndex: number;
  readonly onOpen: () => void;
}

/** El par elegido en la matriz: sus documentos, sus primeras diferencias y «Abrir el par». */
export function MatrixPairPanel({ comparison, pairIndex, onOpen }: MatrixPairPanelProps) {
  const { t } = useI18n();
  const pair = comparison.pairs[pairIndex];
  if (!pair) return null;
  const material = pair.changes.filter((change) => change.risk !== "low");
  return (
    <section aria-label={t("comparison.matrix.selectedPair")} className={styles.detail}>
      <span className={styles.detailKind}>{t("comparison.matrix.selectedPair")}</span>
      <p className={styles.pairNames}>
        <strong>{pair.firstDocument}</strong> {t("comparison.matrix.versus")}{" "}
        <strong>{pair.secondDocument}</strong>
      </p>
      <ul className={styles.pairRows}>
        {material.slice(0, PAIR_ROWS_SHOWN).map((change) => {
          const values = changeValues(change);
          return (
            <li key={change.number}>
              <RiskTag level={change.risk} compact />{" "}
              <span className={styles.before}>{values.before}</span> ≠{" "}
              <span className={styles.after}>{values.after}</span>
            </li>
          );
        })}
      </ul>
      <Button variant="primary" shortcut={["Enter"]} onClick={onOpen}>
        {t("comparison.matrix.open")}
      </Button>
    </section>
  );
}
