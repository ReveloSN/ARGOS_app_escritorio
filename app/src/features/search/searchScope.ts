import type { SearchItem } from "../../components/organisms/SearchDialog";

/** Un resultado con lo que pasa al elegirlo: abrir la alerta, el archivo, la sesión… */
export interface ScopedSearchItem extends SearchItem {
  readonly open: () => void | Promise<void>;
}

export interface ScopedSearchGroup {
  readonly id: string;
  readonly label: string;
  readonly items: readonly ScopedSearchItem[];
}

/** Dónde busca Ctrl K en la pantalla actual (la revisión, el historial o los ajustes). */
export interface SearchScope {
  readonly placeholder: string;
  readonly search: (query: string) => Promise<readonly ScopedSearchGroup[]>;
}

export const MAX_RESULTS_PER_GROUP = 8;

export function nonEmptyGroups(groups: readonly ScopedSearchGroup[]): ScopedSearchGroup[] {
  return groups.filter((group) => group.items.length > 0);
}
