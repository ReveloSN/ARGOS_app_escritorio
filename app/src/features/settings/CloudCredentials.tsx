import { useRef, useState, type ChangeEvent } from "react";

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

/**
 * Lo que se va a guardar: lo pegado (visible, lo escribió el usuario) o un archivo elegido, cuyo
 * contenido —con la clave privada— nunca pasa al estado ni a la pantalla (CLAUDE.md §8).
 */
function useCredentialsInput(control: OcrSettingsControl) {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const fileContent = useRef<string | null>(null);
  const forgetFile = () => {
    fileContent.current = null;
    setFileName(null);
  };
  const chooseFile = (file: File) => {
    void file.text().then((content) => {
      fileContent.current = content;
      setFileName(file.name);
      setText("");
    });
  };
  const save = () => {
    control.storeCredentials(fileContent.current ?? text);
    forgetFile();
    setText("");
  };
  return { text, setText, fileName, forgetFile, chooseFile, save };
}

/** Pegar la clave JSON o elegir el archivo: se lee aquí y va directo al llavero del sistema. */
function CredentialsField({ control }: { control: OcrSettingsControl }) {
  const { t } = useI18n();
  const input = useCredentialsInput(control);
  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) input.chooseFile(file);
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
          value={input.text}
          onChange={(event) => {
            input.forgetFile();
            input.setText(event.target.value);
          }}
        />
      </label>
      {input.fileName && (
        <p className={styles.description}>
          {t("settings.ocr.fileChosen", { name: input.fileName })}
        </p>
      )}
      <div className={styles.inlineRow}>
        <label className={styles.fileButton}>
          {t("settings.ocr.chooseFile")}
          <input type="file" accept=".json,application/json" onChange={onFile} />
        </label>
        <Button size="md" disabled={!input.text.trim() && !input.fileName} onClick={input.save}>
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
