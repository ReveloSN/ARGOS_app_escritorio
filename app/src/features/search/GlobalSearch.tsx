import { useEffect, useState } from "react";

import { SearchDialog, type SearchItem } from "../../components/organisms/SearchDialog";
import { useI18n } from "../../i18n/i18nContext";
import type { ScopedSearchGroup, SearchScope } from "./searchScope";

// Esperar a que el usuario deje de escribir evita una consulta al motor por cada tecla.
const SEARCH_DELAY_MS = 250;
const MIN_QUERY_LENGTH = 2;

interface Results {
  readonly query: string;
  readonly groups: readonly ScopedSearchGroup[];
}

interface GlobalSearchProps {
  readonly scope: SearchScope;
  readonly initialQuery: string;
  readonly onClose: () => void;
}

/** Búsqueda global (Ctrl K) en el ámbito de la pantalla actual. */
export function GlobalSearch({ scope, initialQuery, onClose }: GlobalSearchProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Results | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < MIN_QUERY_LENGTH) return undefined;
    const timer = setTimeout(() => {
      scope.search(trimmed).then(
        (groups) => {
          setFailure(null);
          setResults({ query: trimmed, groups });
        },
        () => {
          setFailure(t("search.failed"));
        },
      );
    }, SEARCH_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
    // `scope` y `t` se recrean en cada render; la búsqueda depende solo del texto escrito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed]);

  const groups = results?.query === trimmed ? results.groups : [];
  const select = (item: SearchItem) => {
    const chosen = groups.flatMap((group) => group.items).find((each) => each.id === item.id);
    if (!chosen) return;
    Promise.resolve(chosen.open()).then(onClose, () => {
      setFailure(t("search.openFailed", { name: chosen.title }));
    });
  };
  return (
    <SearchDialog
      placeholder={scope.placeholder}
      query={query}
      groups={groups}
      status={failure ?? searchStatus({ trimmed, results, t })}
      onQueryChange={setQuery}
      onSelect={select}
      onClose={onClose}
    />
  );
}

interface StatusContext {
  readonly trimmed: string;
  readonly results: Results | null;
  readonly t: ReturnType<typeof useI18n>["t"];
}

function searchStatus({ trimmed, results, t }: StatusContext): string | undefined {
  if (trimmed.length < MIN_QUERY_LENGTH) return t("search.typeMore");
  if (results?.query !== trimmed) return t("search.searching");
  return results.groups.length === 0 ? t("search.noResults", { query: trimmed }) : undefined;
}
