import { MODIFIER_KEY } from "../atoms/Kbd";
import type { TranslationKey } from "../../i18n/translate";

export type SidebarSection = "home" | "review" | "history" | "settings";

export interface SidebarSectionItem {
  readonly section: SidebarSection;
  readonly icon: string;
  readonly label: TranslationKey;
}

/** Navegación global de los mockups: Inicio, Revisión actual, Historial y Ajustes. */
export const SIDEBAR_SECTIONS: readonly SidebarSectionItem[] = [
  { section: "home", icon: "home", label: "navigation.home" },
  { section: "review", icon: "fact_check", label: "navigation.currentReview" },
  { section: "history", icon: "history", label: "navigation.history" },
  { section: "settings", icon: "tune", label: "navigation.settings" },
];

export const NEW_REVIEW_SHORTCUT = [MODIFIER_KEY, "N"];
export const TOGGLE_SIDEBAR_SHORTCUT = [MODIFIER_KEY, "B"];
