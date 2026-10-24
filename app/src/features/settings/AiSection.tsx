import { useState } from "react";

import { Button } from "../../components/atoms/Button";
import { Toggle } from "../../components/atoms/Toggle";
import { ErrorMessage } from "../../components/molecules/ErrorMessage";
import { useI18n } from "../../i18n/i18nContext";
import type { AiSettingsResult } from "../../services/engine/aiTypes";
import styles from "./Settings.module.css";
import { useAiSettings, type AiSettingsControl } from "./useAiSettings";

interface SectionProps {
  readonly settings: AiSettingsResult;
  readonly control: AiSettingsControl;
}

/** Anthropic o DeepSeek: cada uno con su propia clave en el llavero (ADR 028). */
function ProviderSelect({ settings, control }: SectionProps) {
  const { t } = useI18n();
  return (
    <label className={styles.keyLabel}>
      <span>{t("settings.ai.providerLabel")}</span>
      <select
        className={styles.keyInput}
        value={settings.provider}
        onChange={(event) => {
          const chosen = settings.providers.find((item) => item.id === event.target.value);
          if (chosen) control.setProvider(chosen.id);
        }}
      >
        {settings.providers.map((item) => (
          <option key={item.id} value={item.id}>
            {t(`settings.ai.providers.${item.id}`)} · {item.model}
          </option>
        ))}
      </select>
    </label>
  );
}

function KeyField({ settings, control }: SectionProps) {
  const { t } = useI18n();
  const [key, setKey] = useState("");
  const provider = t(`settings.ai.providers.${settings.provider}`);
  const save = () => {
    control.storeKey(key);
    setKey("");
  };
  return (
    <div className={styles.keyRow}>
      <label className={styles.keyLabel}>
        <span>{t("settings.ai.keyLabel", { provider })}</span>
        <input
          type="password"
          autoComplete="off"
          className={styles.keyInput}
          placeholder={t(`settings.ai.keyPlaceholders.${settings.provider}`)}
          value={key}
          onChange={(event) => {
            setKey(event.target.value);
          }}
        />
      </label>
      <Button size="md" disabled={!key.trim()} onClick={save}>
        {t("settings.ai.saveKey")}
      </Button>
    </div>
  );
}

function KeyStatus({ settings, control }: SectionProps) {
  const { t } = useI18n();
  if (!settings.isKeychainAvailable) {
    return (
      <ErrorMessage
        tone="neutral"
        icon="key_off"
        what={t("settings.ai.keychain.what")}
        why={t("settings.ai.keychain.why")}
        todo={t("settings.ai.keychain.todo")}
        primaryAction={{ label: t("settings.ai.keychain.retry"), onClick: control.reload }}
      />
    );
  }
  if (!settings.hasKey) {
    return (
      <>
        <KeyField settings={settings} control={control} />
        <p className={styles.description}>{t("settings.ai.keyMissing")}</p>
      </>
    );
  }
  return (
    <div className={styles.keyRow}>
      <span className={styles.description}>{t("settings.ai.keyStored")}</span>
      <Button size="md" onClick={control.removeKey}>
        {t("settings.ai.removeKey")}
      </Button>
    </div>
  );
}

/** Ajustes > Inteligencia artificial: apagada por defecto; nada sale del equipo sin activarla. */
export function AiSection({ onSaved }: { onSaved: () => void }) {
  const { t } = useI18n();
  const control = useAiSettings(onSaved);
  if (control.state.status !== "ready") {
    const failed = control.state.status === "failed";
    return (
      <p className={styles.description}>
        {t(failed ? "settings.ai.failed" : "settings.ai.loading")}
      </p>
    );
  }
  const settings = control.state.data;
  const provider = t(`settings.ai.providers.${settings.provider}`);
  return (
    <>
      <Toggle
        label={t("settings.ai.toggle")}
        checked={settings.explainsChanges}
        onChange={control.setExplainsChanges}
      />
      <p className={styles.description}>{t("settings.ai.description", { provider })}</p>
      <ProviderSelect settings={settings} control={control} />
      <p className={styles.description}>
        {t("settings.ai.model", { provider, model: settings.model })}
      </p>
      <KeyStatus settings={settings} control={control} />
      {control.hasFailed && <p className={styles.description}>{t("settings.ai.failed")}</p>}
    </>
  );
}
