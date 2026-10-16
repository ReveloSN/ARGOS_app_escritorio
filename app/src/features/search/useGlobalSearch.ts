import { useState } from "react";

import type { AppRoute } from "../navigation/appRoute";
import type { SearchScope } from "./searchScope";
import { useSearchScope } from "./useSearchScope";

export interface GlobalSearchState {
  readonly scope: SearchScope | undefined;
  /** El texto con el que se abrió la búsqueda; null si está cerrada. */
  readonly query: string | null;
  /** Abre la búsqueda (con un texto inicial, p. ej. «Buscar en documentos»); undefined si la pantalla no tiene dónde buscar. */
  readonly open: ((query?: string) => void) | undefined;
  readonly close: () => void;
}

/** Búsqueda global (Ctrl K): se abre en el ámbito de la pantalla y se cierra al navegar. */
export function useGlobalSearch(
  route: AppRoute,
  navigate: (route: AppRoute) => void,
): GlobalSearchState {
  const [query, setQuery] = useState<string | null>(null);
  const close = () => {
    setQuery(null);
  };
  const scope = useSearchScope(route, (next) => {
    close();
    navigate(next);
  });
  const open = (initial = "") => {
    setQuery(initial);
  };
  return { scope, query, open: scope && open, close };
}
