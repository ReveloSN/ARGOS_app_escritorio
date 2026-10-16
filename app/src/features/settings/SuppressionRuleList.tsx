import { useI18n } from "../../i18n/i18nContext";
import type { SuppressionRuleResult } from "../../services/engine/preferencesTypes";
import styles from "./Settings.module.css";

interface SuppressionRuleListProps {
  readonly rules: readonly SuppressionRuleResult[];
  readonly onRemove: (ruleId: number) => void;
}

/** «Casos que no generan alerta», creados con «No alertar casos similares»; cada uno se puede quitar. */
export function SuppressionRuleList({ rules, onRemove }: SuppressionRuleListProps) {
  const { t, format } = useI18n();
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>
        {t("settings.detection.rules")}{" "}
        <span className={styles.fieldNote}>{t("settings.detection.rulesNote")}</span>
      </span>
      {rules.length === 0 ? (
        <p className={styles.description}>{t("settings.detection.noRules")}</p>
      ) : (
        <ul aria-label={t("settings.detection.rules")} className={styles.rules}>
          {rules.map((rule) => {
            const text = t("settings.detection.rule", {
              first: rule.firstLabel,
              second: rule.secondLabel,
            });
            return (
              <li key={rule.id} className={styles.rule}>
                <span title={text} className={styles.ruleText}>
                  {text}
                </span>
                <span className={styles.ruleDate}>
                  {t("settings.detection.since", { date: format.date(new Date(rule.createdAt)) })}
                </span>
                <button
                  type="button"
                  className={styles.link}
                  aria-label={t("settings.detection.removeRule", { rule: text })}
                  onClick={() => {
                    onRemove(rule.id);
                  }}
                >
                  {t("settings.detection.remove")}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
