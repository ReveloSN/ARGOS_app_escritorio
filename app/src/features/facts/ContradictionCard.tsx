import { RiskTag } from "../../components/atoms/RiskTag";
import { joinClassNames } from "../../components/joinClassNames";
import { useI18n } from "../../i18n/i18nContext";
import type { ContradictionResult } from "../../services/engine/factTypes";
import { describeLocation } from "../alerts/alertPresentation";
import styles from "./Facts.module.css";

interface ContradictionCardProps {
  readonly contradiction: ContradictionResult;
  readonly onOpen: (document: string, location: string) => void;
}

/** Un valor que contradice el dato confirmado, con cada documento y lugar donde aparece. */
export function ContradictionCard({ contradiction, onOpen }: ContradictionCardProps) {
  const { t } = useI18n();
  return (
    <div className={joinClassNames(styles.contradiction, styles[contradiction.risk])}>
      <RiskTag level={contradiction.risk} variant="long" />
      {contradiction.occurrences.map((occurrence, index) => {
        const where = describeLocation(occurrence.location, t);
        return (
          <div key={`${occurrence.document}-${String(index)}`} className={styles.occurrence}>
            <span className={styles.document}>{occurrence.document}</span>
            <span className={styles.where}>{where}</span>
            <span className={styles.differs}>
              <span aria-label={t("comparison.inconsistencies.odd")}>≠ </span>
              {contradiction.value}
            </span>
            <button
              type="button"
              className={styles.action}
              onClick={() => {
                onOpen(occurrence.document, where);
              }}
            >
              {t("facts.aside.viewDocument")}
            </button>
          </div>
        );
      })}
    </div>
  );
}
