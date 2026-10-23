import { useState } from "react";

import { Button } from "../../components/atoms/Button";
import { useI18n } from "../../i18n/i18nContext";
import type { TranslationKey } from "../../i18n/translate";
import type { OcrProcessorInput, OcrSettingsResult } from "../../services/engine/ocrTypes";
import styles from "./Settings.module.css";

// Las dos ubicaciones donde Google ofrece los procesadores de Document AI.
const LOCATIONS: readonly { readonly value: string; readonly label: TranslationKey }[] = [
  { value: "us", label: "settings.ocr.locations.us" },
  { value: "eu", label: "settings.ocr.locations.eu" },
];
const DEFAULT_LOCATION = "us";

interface CloudProcessorFormProps {
  readonly settings: OcrSettingsResult;
  readonly onSave: (processor: OcrProcessorInput) => void;
}

function TextField(props: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className={styles.keyLabel}>
      <span>{props.label}</span>
      <input
        autoComplete="off"
        spellCheck={false}
        className={styles.keyInput}
        value={props.value}
        onChange={(event) => {
          props.onChange(event.target.value);
        }}
      />
    </label>
  );
}

/** El procesador OCR de Document AI: proyecto, ubicación e identificador, como en Google Cloud. */
export function CloudProcessorForm({ settings, onSave }: CloudProcessorFormProps) {
  const { t } = useI18n();
  const [projectId, setProjectId] = useState(settings.projectId);
  const [location, setLocation] = useState(settings.location || DEFAULT_LOCATION);
  const [processorId, setProcessorId] = useState(settings.processorId);
  const isComplete = Boolean(projectId.trim() && processorId.trim());
  return (
    <div className={styles.keyRow}>
      <TextField label={t("settings.ocr.projectId")} value={projectId} onChange={setProjectId} />
      <label className={styles.keyLabel}>
        <span>{t("settings.ocr.location")}</span>
        <select
          className={styles.keyInput}
          value={location}
          onChange={(event) => {
            setLocation(event.target.value);
          }}
        >
          {LOCATIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.label)}
            </option>
          ))}
        </select>
      </label>
      <TextField
        label={t("settings.ocr.processorId")}
        value={processorId}
        onChange={setProcessorId}
      />
      <Button
        size="md"
        disabled={!isComplete}
        onClick={() => {
          onSave({ projectId, location, processorId });
        }}
      >
        {t("settings.ocr.saveProcessor")}
      </Button>
    </div>
  );
}
