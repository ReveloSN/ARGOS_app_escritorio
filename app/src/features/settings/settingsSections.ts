import type { TranslationKey } from "../../i18n/translate";

export type SettingsSectionId =
  | "account"
  | "detection"
  | "privacy"
  | "ai"
  | "ocr"
  | "language"
  | "appearance"
  | "assistant"
  | "shortcuts";

export interface SettingsSectionItem {
  readonly id: SettingsSectionId;
  readonly title: TranslationKey;
}

export interface SettingsGroupItem {
  readonly id: string;
  readonly title: TranslationKey;
  readonly description: TranslationKey;
  readonly sections: readonly SettingsSectionItem[];
}

/**
 * Ajustes en dos grupos: lo que depende del motor de análisis y lo que se guarda en este equipo
 * y funciona aunque el motor no responda. El orden es el de la navegación lateral.
 */
export const SETTINGS_GROUPS: readonly SettingsGroupItem[] = [
  {
    id: "analysis",
    title: "settings.groups.analysis.title",
    description: "settings.groups.analysis.description",
    sections: [
      { id: "detection", title: "settings.sections.detection" },
      { id: "privacy", title: "settings.sections.privacy" },
      { id: "ai", title: "settings.sections.ai" },
      { id: "ocr", title: "settings.sections.ocr" },
    ],
  },
  {
    id: "app",
    title: "settings.groups.app.title",
    description: "settings.groups.app.description",
    sections: [
      { id: "language", title: "settings.sections.language" },
      { id: "appearance", title: "settings.sections.appearance" },
      { id: "assistant", title: "settings.sections.assistant" },
      { id: "shortcuts", title: "settings.sections.shortcuts" },
    ],
  },
];

export const SETTINGS_SECTIONS: readonly SettingsSectionItem[] = SETTINGS_GROUPS.flatMap(
  (group) => group.sections,
);

const ACCOUNT_SECTION: SettingsSectionItem = { id: "account", title: "settings.sections.account" };

/** Las secciones que existen: «Cuenta» solo aparece si esta instalación tiene cuenta. */
export function settingsGroupsFor(hasAccount: boolean): readonly SettingsGroupItem[] {
  if (!hasAccount) return SETTINGS_GROUPS;
  return SETTINGS_GROUPS.map((group) =>
    group.id === "app" ? { ...group, sections: [ACCOUNT_SECTION, ...group.sections] } : group,
  );
}

export function settingsSectionsFor(hasAccount: boolean): readonly SettingsSectionItem[] {
  return settingsGroupsFor(hasAccount).flatMap((group) => group.sections);
}

export function scrollToSettingsSection(id: string): void {
  document.getElementById(id)?.scrollIntoView({ block: "start" });
}
