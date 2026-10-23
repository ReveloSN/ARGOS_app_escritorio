import { useI18n } from "../../i18n/i18nContext";
import { useEngineServices } from "../engine/EngineServicesContext";
import type { AppRoute } from "../navigation/appRoute";
import { useReview } from "../review/reviewContext";
import { historySearchScope, settingsSearchScope } from "./pageSearchScopes";
import { reviewSearchScope } from "./reviewSearchScope";
import type { SearchScope } from "./searchScope";

// Comparar y Revisar antes de enviar todavía no tienen búsqueda propia (Ctrl K no hace nada).
const NO_SEARCH = {
  home: () => undefined,
  newReview: () => undefined,
  compare: () => undefined,
  send: () => undefined,
} as const;

/**
 * Dónde busca Ctrl K según la pantalla. En Inicio y Nueva revisión no hay nada que buscar: la
 * barra superior no muestra la búsqueda (nunca un control que no hace nada).
 */
export function useSearchScope(
  route: AppRoute,
  navigate: (route: AppRoute) => void,
): SearchScope | undefined {
  const i18n = useI18n();
  const { documents, history } = useEngineServices();
  const { review } = useReview();
  const reviewScope = () =>
    review ? reviewSearchScope({ review, documents, i18n, navigate }) : undefined;
  const scopes: Readonly<Record<AppRoute["page"], () => SearchScope | undefined>> = {
    ...NO_SEARCH,
    results: reviewScope,
    alert: reviewScope,
    history: () => historySearchScope({ history, i18n, navigate }),
    settings: () => settingsSearchScope(i18n),
  };
  return scopes[route.page]();
}
