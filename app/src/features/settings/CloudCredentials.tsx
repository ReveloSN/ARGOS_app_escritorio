import { useState, type ChangeEvent } from "react";

import { Button } from "../../components/atoms/Button";
import { ErrorMessage } from "../../components/molecules/ErrorMessage";
import { useI18n } from "../../i18n/i18nContext";
import type { OcrSettingsResult } from "../../services/engine/ocrTypes";
import styles from "./Settings.module.css";
import type { OcrSettingsControl } from "./useOcrSettings";

interface CloudCredentialsProps {
  readonly settings: OcrSettingsResult;
  readonly control: OcrSettingsControl;
}

/** Pegar la clave JSON o elegir el archivo: se lee aquí y va directo al llavero del sistema. */
function CredentialsField({ control }: { control: OcrSettingsControl }) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    void event.target.files?.[0]?.text().then(setText);
    event.target.value = "";
  };
  return (
    <>
      <label className={styles.keyLabel}>
        <span>{t("settings.ocr.credentialsLabel")}</span>
        <textarea
          rows={4}
          autoComplete="off"
          spellCheck={false}
          className={styles.credentials}
          placeholder={t("settings.ocr.credentialsPlaceholder")}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
          }}
        />
      </label>
      <div className={styles.inlineRow}>
        <label className={styles.fileButton}>
          {t("settings.ocr.chooseFile")}
          <input type="file" accept=".json,application/json" onChange={chooseFile} />
        </label>
        <Button
          size="md"
          disabled={!text.trim()}
          onClick={() => {
            control.storeCredentials(text);
            setText("");
          }}
        >
          {t("settings.ocr.saveCredentials")}
        </Button>
      </div>
      {control.problem === "invalid_credentials" && (
        <p role="alert" className={styles.description}>
          {t("settings.ocr.invalidCredentials")}
        </p>
      )}
    </>
  );
}

/** La clave de la cuenta de servicio: guardada en el llavero, nunca se muestra ni se devuelve. */
export function CloudCredentials({ settings, control }: CloudCredentialsProps) {
  const { t } = useI18n();
  if (!settings.isKeychainAvailable) {
    return (
      <ErrorMessage
        tone="neutral"
        icon="key_off"
        what={t("settings.ai.keychain.what")}
        why={t("settings.ai.keychain.why")}
        todo={t("settings.ocr.keychainTodo")}
        primaryAction={{ label: t("settings.ai.keychain.retry"), onClick: control.reload }}
      />
    );
  }
  if (!settings.hasCredentials) return <CredentialsField control={control} />;
  return (
    <div className={styles.inlineRow}>
      <span className={styles.description}>{t("settings.ocr.credentialsStored")}</span>
      <Button size="md" onClick={control.removeCredentials}>
        {t("settings.ocr.removeCredentials")}
      </Button>
    </div>
  );
}
