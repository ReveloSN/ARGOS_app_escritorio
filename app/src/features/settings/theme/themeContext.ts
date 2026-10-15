import { createContext, useContext } from "react";

import type { Theme, ThemePreference } from "./resolveTheme";

export interface ThemeState {
  readonly preference: ThemePreference;
  readonly theme: Theme;
  readonly setPreference: (preference: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeState | null>(null);

export function useTheme(): ThemeState {
  const state = useContext(ThemeContext);
  if (!state) throw new Error("Falta ThemeProvider en la raíz de la app.");
  return state;
}
