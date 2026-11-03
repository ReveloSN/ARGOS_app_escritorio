import { ErrorMessage } from "../../components/molecules/ErrorMessage";
import { useI18n } from "../../i18n/i18nContext";
import type { TranslationKey } from "../../i18n/translate";
import styles from "./Settings.module.css";

interface SettingsLoadStateProps {
  readonly isFailed: boolean;
  readonly loading: TranslationKey;
  /** Cómo se llama la sección en el aviso: «IA», «OCR». */
  readonly section: string;
  readonly onRetry: () => void;
}

/** Mientras cargan los ajustes de una sección: «Cargando…» o, si falló, el error en 3 partes. */
export function SettingsLoadState({ isFailed, loading, section, onRetry }: SettingsLoadStateProps) {
  const { t } = useI18n();
  if (!isFailed) return <p className={styles.description}>{t(loading)}</p>;
  return (
    <ErrorMessage
      tone="neutral"
      what={t("settings.loadFailed.what", { section })}
      why={t("settings.loadFailed.why")}
      todo={t("settings.loadFailed.todo")}
      primaryAction={{ label: t("settings.loadFailed.retry"), onClick: onRetry }}
    />
  );
}
