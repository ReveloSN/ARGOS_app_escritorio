import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

import {
  readChoice,
  type PreferenceStorage,
} from "../../../services/preferences/preferenceStorage";
import { resolveTheme, type ThemePreference } from "./resolveTheme";
import { ThemeContext, type ThemeState } from "./themeContext";

const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";
const THEME_KEY = "argus.theme";
const THEME_PREFERENCES: readonly ThemePreference[] = ["light", "dark", "system"];

function subscribeToSystemScheme(onChange: () => void): () => void {
  const query = window.matchMedia(DARK_SCHEME_QUERY);
  query.addEventListener("change", onChange);
  return () => {
    query.removeEventListener("change", onChange);
  };
}

function systemPrefersDark(): boolean {
  return window.matchMedia(DARK_SCHEME_QUERY).matches;
}

interface ThemeProviderProps {
  readonly initialPreference?: ThemePreference;
  /** Dónde se recuerda el tema elegido; sin él vale solo en esta ejecución. */
  readonly storage?: PreferenceStorage;
  readonly children: ReactNode;
}

/** Aplica el tema como `data-theme` en el documento; los tokens semánticos hacen el resto. */
export function ThemeProvider({
  initialPreference = "system",
  storage,
  children,
}: ThemeProviderProps) {
  const [preference, setPreference] = useState<ThemePreference>(
    () => readChoice(storage, THEME_KEY, THEME_PREFERENCES) ?? initialPreference,
  );
  const prefersDark = useSyncExternalStore(subscribeToSystemScheme, systemPrefersDark);
  const theme = resolveTheme(preference, prefersDark);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const state = useMemo<ThemeState>(
    () => ({
      preference,
      theme,
      setPreference: (next) => {
        storage?.write(THEME_KEY, next);
        setPreference(next);
      },
    }),
    [preference, theme, storage],
  );
  return <ThemeContext.Provider value={state}>{children}</ThemeContext.Provider>;
}
