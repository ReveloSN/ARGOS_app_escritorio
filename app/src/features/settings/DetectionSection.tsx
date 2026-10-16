import { Checkbox } from "../../components/atoms/Checkbox";
import { SegmentedControl } from "../../components/molecules/SegmentedControl";
import { useI18n } from "../../i18n/i18nContext";
import type {
  ComparedCategoryValue,
  PreferencesResult,
  SensitivityValue,
} from "../../services/engine/preferencesTypes";
import styles from "./Settings.module.css";
import { SuppressionRuleList } from "./SuppressionRuleList";
import type { EnginePreferences } from "./useEnginePreferences";

const SENSITIVITIES: readonly SensitivityValue[] = ["strict", "balanced", "permissive"];
const CATEGORIES: readonly ComparedCategoryValue[] = [
  "identifiers",
  "dates",
  "amounts",
  "names",
  "periods",
];

interface DetectionSectionProps {
  readonly preferences: PreferencesResult;
  readonly engine: EnginePreferences;
}

/** Ajustes > Detección: sensibilidad, tipos que se comparan y casos que no generan alerta. */
export function DetectionSection({ preferences, engine }: DetectionSectionProps) {
  const { t } = useI18n();
  const compared = preferences.comparedCategories;
  const toggle = (category: ComparedCategoryValue) => {
    const next = compared.includes(category)
      ? compared.filter((item) => item !== category)
      : [...compared, category];
    engine.save({ comparedCategories: next });
  };
  return (
    <>
      <div className={styles.field}>
        <span className={styles.fieldLabel}>{t("settings.detection.sensitivity")}</span>
        <SegmentedControl
          label={t("settings.detection.sensitivity")}
          value={preferences.sensitivity}
          options={SENSITIVITIES.map((value) => ({
            value,
            label: t(`settings.sensitivity.${value}`),
          }))}
          onChange={(value) => {
            engine.save({ sensitivity: value as SensitivityValue });
          }}
        />
        <p className={styles.description}>
          {t(`settings.sensitivity.${preferences.sensitivity}Description`)}
        </p>
      </div>
      <div role="group" aria-label={t("settings.detection.types")} className={styles.field}>
        <span className={styles.fieldLabel}>{t("settings.detection.types")}</span>
        <div className={styles.options}>
          {CATEGORIES.map((category) => (
            <Checkbox
              key={category}
              label={t(`settings.categories.${category}`)}
              checked={compared.includes(category)}
              // Siempre se compara al menos un tipo: el último no se puede desmarcar.
              disabled={compared.length === 1 && compared.includes(category)}
              onChange={() => {
                toggle(category);
              }}
            />
          ))}
        </div>
      </div>
      <SuppressionRuleList rules={preferences.suppressionRules} onRemove={engine.removeRule} />
    </>
  );
}
