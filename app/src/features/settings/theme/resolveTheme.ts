/** Ajustes > Apariencia: «Claro», «Oscuro» o «Según el sistema». */
export type ThemePreference = "light" | "dark" | "system";
export type Theme = "light" | "dark";

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): Theme {
  if (preference !== "system") return preference;
  return systemPrefersDark ? "dark" : "light";
}
