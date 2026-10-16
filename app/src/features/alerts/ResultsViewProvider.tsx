import { useMemo, useState, type ReactNode } from "react";

import { NO_FILTERS, type AlertFilters } from "./alertFilters";
import { ResultsViewContext, type ResultsTab, type ResultsViewState } from "./resultsViewContext";

interface ResultsView {
  readonly sessionId: string | undefined;
  readonly tab: ResultsTab;
  readonly filters: AlertFilters;
  readonly selectedNumber: number | null;
}

function initialView(sessionId: string | undefined): ResultsView {
  return { sessionId, tab: "alerts", filters: NO_FILTERS, selectedNumber: null };
}

interface ResultsViewProviderProps {
  /** La vista vuelve a empezar (pestaña, filtros, selección) cuando cambia la revisión. */
  readonly sessionId: string | undefined;
  readonly children: ReactNode;
}

export function ResultsViewProvider({ sessionId, children }: ResultsViewProviderProps) {
  const [stored, setStored] = useState(() => initialView(sessionId));
  const view = stored.sessionId === sessionId ? stored : initialView(sessionId);

  const state = useMemo<ResultsViewState>(() => {
    const update = (change: Partial<ResultsView>) => {
      setStored({ ...view, ...change });
    };
    return {
      ...view,
      setTab: (tab) => {
        update({ tab });
      },
      setFilters: (filters) => {
        update({ filters });
      },
      select: (selectedNumber) => {
        update({ selectedNumber });
      },
    };
  }, [view]);
  return <ResultsViewContext.Provider value={state}>{children}</ResultsViewContext.Provider>;
}
