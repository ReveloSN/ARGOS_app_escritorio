import { useI18n } from "../../i18n/i18nContext";
import styles from "./Compare.module.css";

interface IntroProps {
  readonly dataCount: number;
  readonly documentCount: number;
  /** Si el expediente abierto tiene datos confirmados que sirvan de referencia. */
  readonly hasConfirmedFacts: boolean;
}

/** «1 dato no coincide en 2 documentos.» y, si no hay referencia, que aún no hay datos confirmados. */
export function InconsistenciesIntro({ dataCount, documentCount, hasConfirmedFacts }: IntroProps) {
  const { t, tPlural } = useI18n();
  const summary = t("comparison.inconsistencies.intro", {
    found: tPlural({ key: "comparison.inconsistencies.found", count: dataCount }),
    documents: tPlural({ key: "comparison.inconsistencies.documents", count: documentCount }),
  });
  return (
    <p className={styles.intro}>
      {hasConfirmedFacts ? summary : `${summary} ${t("comparison.inconsistencies.noFacts")}`}
    </p>
  );
}

/** Qué significa «≠»: frente a los demás documentos o frente al dato confirmado. */
export function InconsistenciesLegend({ isConfirmedReference }: { isConfirmedReference: boolean }) {
  const { t } = useI18n();
  const key = isConfirmedReference
    ? "comparison.inconsistencies.legendConfirmed"
    : "comparison.inconsistencies.legend";
  return <p className={styles.legendNote}>{t(key)}</p>;
}
