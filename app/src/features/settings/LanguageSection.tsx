import { SelectField } from "../../components/molecules/SelectField";
import { useI18n } from "../../i18n/i18nContext";
import { LOCALES, REGIONS, type Locale, type Region } from "../../i18n/messages";
import styles from "./Settings.module.css";

// Monto de ejemplo para la vista previa del formato regional; no es un dato de una revisión.
const PREVIEW_AMOUNT = 1_234_567.5;
const CURRENCY_BY_REGION: Readonly<Record<Region, string>> = { "es-CO": "COP", "en-US": "USD" };

interface LanguageSectionProps {
  readonly onSaved: () => void;
}

/** Ajustes > Idioma y región: el idioma de la interfaz y el formato de fechas y montos. */
export function LanguageSection({ onSaved }: LanguageSectionProps) {
  const { t, locale, setLocale, region, setRegion, format } = useI18n();
  const preview = `${format.date(new Date())} · ${format.amount(PREVIEW_AMOUNT, CURRENCY_BY_REGION[region])}`;
  return (
    <>
      <div className={styles.twoColumns}>
        <SelectField
          label={t("settings.language.language")}
          value={locale}
          options={LOCALES.map((value) => ({
            value,
            label: t(`settings.language.locales.${value}`),
          }))}
          onChange={(value) => {
            setLocale(value as Locale);
            onSaved();
          }}
        />
        <SelectField
          label={t("settings.language.region")}
          value={region}
          options={REGIONS.map((value) => ({
            value,
            label: t(`settings.language.regions.${value}`),
          }))}
          onChange={(value) => {
            setRegion(value as Region);
            onSaved();
          }}
        />
      </div>
      <span className={styles.preview}>
        {t("settings.language.preview")} <span className={styles.mono}>{preview}</span>
      </span>
    </>
  );
}
