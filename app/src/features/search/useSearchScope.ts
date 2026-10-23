import { useI18n } from "../../i18n/i18nContext";
import { useEngineServices } from "../engine/EngineServicesContext";
import type { AppRoute } from "../navigation/appRoute";
import { useReview } from "../review/reviewContext";
import { historySearchScope, settingsSearchScope } from "./pageSearchScopes";
import { reviewSearchScope } from "./reviewSearchScope";
import type { SearchScope } from "./searchScope";

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
    home: () => undefined,
    newReview: () => undefined,
    results: reviewScope,
    alert: reviewScope,
    history: () => historySearchScope({ history, i18n, navigate }),
    settings: () => settingsSearchScope(i18n),
    // Comparar todavía no tiene búsqueda propia (Ctrl K no hace nada ahí).
    compare: () => undefined,
  };
  return scopes[route.page]();
}
