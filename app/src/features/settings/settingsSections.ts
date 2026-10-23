import type { TranslationKey } from "../../i18n/translate";

export interface SettingsSectionItem {
  readonly id: string;
  readonly title: TranslationKey;
}

/** Secciones de Ajustes de los mockups, en el orden de la navegación lateral. */
export const SETTINGS_SECTIONS: readonly SettingsSectionItem[] = [
  { id: "detection", title: "settings.sections.detection" },
  { id: "language", title: "settings.sections.language" },
  { id: "appearance", title: "settings.sections.appearance" },
  { id: "privacy", title: "settings.sections.privacy" },
  { id: "ai", title: "settings.sections.ai" },
  { id: "shortcuts", title: "settings.sections.shortcuts" },
];

export function scrollToSettingsSection(id: string): void {
  document.getElementById(id)?.scrollIntoView({ block: "start" });
}
