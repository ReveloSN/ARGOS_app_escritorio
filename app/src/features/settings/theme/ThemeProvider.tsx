import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

import { resolveTheme, type ThemePreference } from "./resolveTheme";
import { ThemeContext, type ThemeState } from "./themeContext";

const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";

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
  readonly children: ReactNode;
}

/** Aplica el tema como `data-theme` en el documento; los tokens semánticos hacen el resto. */
export function ThemeProvider({ initialPreference = "system", children }: ThemeProviderProps) {
  const [preference, setPreference] = useState<ThemePreference>(initialPreference);
  const prefersDark = useSyncExternalStore(subscribeToSystemScheme, systemPrefersDark);
  const theme = resolveTheme(preference, prefersDark);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const state = useMemo<ThemeState>(
    () => ({ preference, theme, setPreference }),
    [preference, theme],
  );
  return <ThemeContext.Provider value={state}>{children}</ThemeContext.Provider>;
}
