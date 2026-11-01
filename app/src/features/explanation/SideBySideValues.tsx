import { DiffMark } from "../../components/atoms/DiffMark";
import { Icon } from "../../components/atoms/Icon";
import { useI18n } from "../../i18n/i18nContext";
import type { TranslationKey } from "../../i18n/translate";
import styles from "./ExplanationPanel.module.css";
import type { SideBySide, SideValue } from "./sideValues";

interface ValueCardProps {
  readonly title: TranslationKey;
  readonly value: SideValue;
}

const SIDE_TITLES = {
  first: "explainPanel.sideA",
  second: "explainPanel.sideB",
} as const satisfies Record<string, TranslationKey>;

/** Un documento y lo que dice; la diferencia lleva forma (tachado, subrayado, borde) además del color. */
function ValueCard({ title, value }: ValueCardProps) {
  const { t } = useI18n();
  return (
    <section aria-label={`${t(title)}: ${value.document}`} className={styles.valueCard}>
      <h3 className={styles.valueTitle}>{t(title)}</h3>
      <span title={value.document} className={styles.valueDocument}>
        {value.document}
      </span>
      {value.location && <span className={styles.valueLocation}>{value.location}</span>}
      {value.runs ? (
        <p className={styles.valueText}>
          {value.runs.map((run, index) =>
            run.mark ? (
              <DiffMark key={index} kind={run.mark}>
                {run.text}
              </DiffMark>
            ) : (
              <span key={index}>{run.text}</span>
            ),
          )}
        </p>
      ) : (
        <p className={styles.valueAbsent}>
          <Icon name="block" size="sm" />
          {t("explainPanel.absent")}
        </p>
      )}
    </section>
  );
}

/** «Documento A dice» y «Documento B dice», uno junto al otro. */
export function SideBySideValues({ values }: { readonly values: SideBySide }) {
  return (
    <div className={styles.values}>
      <ValueCard title={SIDE_TITLES.first} value={values.first} />
      <ValueCard title={SIDE_TITLES.second} value={values.second} />
    </div>
  );
}
