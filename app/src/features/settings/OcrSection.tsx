import { Toggle } from "../../components/atoms/Toggle";
import { ErrorMessage } from "../../components/molecules/ErrorMessage";
import { useI18n } from "../../i18n/i18nContext";
import type { OcrSettingsResult } from "../../services/engine/ocrTypes";
import { CloudCredentials } from "./CloudCredentials";
import { CloudProcessorForm } from "./CloudProcessorForm";
import styles from "./Settings.module.css";
import { SettingsLoadState } from "./SettingsLoadState";
import type { OcrSettingsControl } from "./useOcrSettings";

function LocalStatus({
  settings,
  control,
}: {
  settings: OcrSettingsResult;
  control: OcrSettingsControl;
}) {
  const { t } = useI18n();
  if (settings.isLocalAvailable) {
    return <p className={styles.description}>{t("settings.ocr.localAvailable")}</p>;
  }
  return (
    <ErrorMessage
      tone="neutral"
      what={t("settings.ocr.localMissing.what")}
      why={t("settings.ocr.localMissing.why")}
      todo={t("settings.ocr.localMissing.todo")}
      primaryAction={{ label: t("settings.ocr.localMissing.retry"), onClick: control.reload }}
    />
  );
}

function CloudSettings({
  settings,
  control,
}: {
  settings: OcrSettingsResult;
  control: OcrSettingsControl;
}) {
  const { t } = useI18n();
  return (
    <>
      <Toggle
        label={t("settings.ocr.cloudToggle")}
        checked={settings.usesCloud}
        onChange={control.setUsesCloud}
      />
      <p className={styles.description}>{t("settings.ocr.cloudDescription")}</p>
      {settings.usesCloud && (
        <>
          <CloudProcessorForm settings={settings} onSave={control.setProcessor} />
          <CloudCredentials settings={settings} control={control} />
        </>
      )}
    </>
  );
}

/** Ajustes › OCR: local por defecto; Document AI apagado hasta que el usuario lo configure. */
export function OcrSection({ control }: { readonly control: OcrSettingsControl }) {
  const { t } = useI18n();
  if (control.state.status !== "ready") {
    return <SettingsLoadState isFailed={control.state.status === "failed"} />;
  }
  const settings = control.state.data;
  return (
    <>
      <LocalStatus settings={settings} control={control} />
      <CloudSettings settings={settings} control={control} />
      {control.problem === "failed" && (
        <p className={styles.description}>{t("settings.ocr.failed")}</p>
      )}
    </>
  );
}
