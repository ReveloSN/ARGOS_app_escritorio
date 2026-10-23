import { useResultsView, type ResultsTab } from "../alerts/resultsViewContext";
import { useCloseReview, type ReviewCloser } from "../review/useCloseReview";
import { HOME_ROUTE, type AppRoute } from "./appRoute";

export interface PageNavigation {
  readonly openHome: () => void;
  readonly openNewReview: () => void;
  readonly openCompare: () => void;
  /** «Generar informe» del expediente. */
  readonly openReport: () => void;
  readonly openAlert: (number: number) => void;
  /** Resultados en una pestaña concreta: Alertas, Archivos o Decisiones. */
  readonly openTab: (tab: ResultsTab) => void;
  readonly openHistory: (sessionId?: string) => void;
  /** «Cerrar revisión»: al confirmar, el historial muestra la sesión cerrada. */
  readonly closer: ReviewCloser;
}

function routeOpeners(navigate: (route: AppRoute) => void) {
  return {
    openHome: () => {
      navigate(HOME_ROUTE);
    },
    openNewReview: () => {
      navigate({ page: "newReview" });
    },
    openCompare: () => {
      navigate({ page: "compare" });
    },
    openAlert: (number: number) => {
      navigate({ page: "alert", number });
    },
    openHistory: (sessionId?: string) => {
      navigate(sessionId ? { page: "history", sessionId } : { page: "history" });
    },
  };
}

/** Los movimientos entre pantallas del mapa de navegación de los mockups. */
export function usePageNavigation(navigate: (route: AppRoute) => void): PageNavigation {
  const { setTab } = useResultsView();
  const openers = routeOpeners(navigate);
  const openTab = (tab: ResultsTab) => {
    setTab(tab);
    navigate({ page: "results" });
  };
  const openReport = () => {
    navigate({ page: "report" });
  };
  return { ...openers, openTab, openReport, closer: useCloseReview(openers.openHistory) };
}
