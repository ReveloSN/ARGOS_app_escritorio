import { useState, type ReactNode } from "react";

import { Icon } from "../components/atoms/Icon";
import { ErrorMessage } from "../components/molecules/ErrorMessage";
import { useEngineStatus } from "../features/engine/useEngineStatus";
import { AccountSection } from "../features/account/AccountSection";
import { hasAccountFeature, useAccount } from "../features/account/accountContext";
import { AiSection } from "../features/settings/AiSection";
import { AssistantSection } from "../features/settings/AssistantSection";
import { DetectionSection } from "../features/settings/DetectionSection";
import { EngineSettings } from "../features/settings/EngineSettings";
import { LanguageSection } from "../features/settings/LanguageSection";
import { OcrSection } from "../features/settings/OcrSection";
import { PrivacySection } from "../features/settings/PrivacySection";
import styles from "../features/settings/Settings.module.css";
import { SettingsGroup } from "../features/settings/SettingsGroup";
import { SettingsNav } from "../features/settings/SettingsNav";
import { SettingsSection } from "../features/settings/SettingsSection";
import {
  SETTINGS_SECTIONS,
  settingsGroupsFor,
  type SettingsSectionId,
} from "../features/settings/settingsSections";
import { ShortcutsSection } from "../features/settings/ShortcutsSection";
import { AppearanceSwitch } from "../features/settings/theme/AppearanceSwitch";
import { useSettingsLoad } from "../features/settings/useSettingsLoad";
import { useI18n } from "../i18n/i18nContext";

type SettingsLoad = ReturnType<typeof useSettingsLoad>;

function sectionBodies(load: SettingsLoad, markSaved: () => void) {
  const { engine, ai, ocr } = load;
  const bodies: Readonly<Record<SettingsSectionId, ReactNode>> = {
    account: <AccountSection />,
    detection: (
      <EngineSettings engine={engine}>
        {(preferences) => <DetectionSection preferences={preferences} engine={engine} />}
      </EngineSettings>
    ),
    privacy: (
      <EngineSettings engine={engine}>
        {(preferences) => <PrivacySection preferences={preferences} engine={engine} />}
      </EngineSettings>
    ),
    ai: <AiSection control={ai} />,
    ocr: <OcrSection control={ocr} />,
    language: <LanguageSection onSaved={markSaved} />,
    appearance: <AppearanceSwitch onChange={markSaved} />,
    assistant: <AssistantSection onSaved={markSaved} />,
    shortcuts: <ShortcutsSection />,
  };
  return bodies;
}

/**
 * Error propio de Ajustes: fallos de guardado, o de carga con el motor respondiendo. Con el motor
 * detenido lo dice el aviso de conexión de la app; mientras arranca, la carga se recupera sola al
 * responder. En ambos casos aquí no se repite.
 */
function SettingsProblem({ load }: { readonly load: SettingsLoad }) {
  const { t } = useI18n();
  const isEngineReady = useEngineStatus() === "ready";
  const hasLoadProblem = load.hasLoadFailed && isEngineReady;
  if (!hasLoadProblem && !load.engine.hasSaveFailed) return null;
  const problem = load.hasLoadFailed ? "settings.unavailable" : "settings.saveFailed";
  return (
    <ErrorMessage
      tone="neutral"
      what={t(`${problem}.what`)}
      why={t(`${problem}.why`)}
      todo={t(`${problem}.todo`)}
      primaryAction={{ label: t("settings.unavailable.retry"), onClick: load.reload }}
    />
  );
}

/** Ajustes: cada cambio se guarda al instante y se confirma con la hora (mockup 05). */
export function SettingsPage() {
  const { t, format } = useI18n();
  const [active, setActive] = useState<SettingsSectionId>(SETTINGS_SECTIONS[0]?.id ?? "detection");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const markSaved = () => {
    setSavedAt(new Date());
  };
  const load = useSettingsLoad(markSaved);
  const bodies = sectionBodies(load, markSaved);
  const { state } = useAccount();

  return (
    <div className={styles.layout}>
      <SettingsNav active={active} onSelect={setActive} />
      <div className={styles.scroll}>
        <div className={styles.content}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{t("settings.title")}</h1>
            {savedAt && (
              <span role="status" className={styles.saved}>
                <Icon name="check" size="sm" className={styles.savedIcon} />
                {t("settings.saved")} · <span className={styles.mono}>{format.time(savedAt)}</span>
              </span>
            )}
          </div>
          <SettingsProblem load={load} />
          {settingsGroupsFor(hasAccountFeature(state)).map((group) => (
            <SettingsGroup key={group.id} group={group}>
              {group.sections.map((section) => (
                <SettingsSection key={section.id} id={section.id} title={t(section.title)}>
                  {bodies[section.id]}
                </SettingsSection>
              ))}
            </SettingsGroup>
          ))}
        </div>
      </div>
    </div>
  );
}
