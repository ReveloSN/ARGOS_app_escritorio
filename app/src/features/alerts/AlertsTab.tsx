import { useRef } from "react";

import { Icon } from "../../components/atoms/Icon";
import { ShortcutBar } from "../../components/molecules/ShortcutBar";
import { AlertList } from "../../components/organisms/AlertList";
import { useI18n } from "../../i18n/i18nContext";
import type { ReviewResult } from "../../services/engine/reviewTypes";
import { AlertFiltersBar } from "./AlertFiltersBar";
import styles from "./AlertsTab.module.css";
import { AlertsToolbar, SEARCH_KEY } from "./AlertsToolbar";
import { NoMatchingAlerts } from "./NoMatchingAlerts";
import { useResultsView } from "./resultsViewContext";
import type { AlertDecisions } from "./useAlertDecisions";
import { UNDO_KEYS, useDecisionShortcuts } from "./useDecisionShortcuts";
import { useRowActions } from "./useRowActions";
import { useVisibleAlerts } from "./useVisibleAlerts";

interface AlertsTabProps {
  readonly review: ReviewResult;
  readonly decisions: AlertDecisions;
  readonly onOpenAlert: (number: number) => void;
  /** «Buscar en documentos»: la búsqueda global con el texto escrito. */
  readonly onSearchDocuments?: ((query: string) => void) | undefined;
}

/** Pestaña «Alertas»: lista faceted agrupada por riesgo, con decisión inline y atajos. */
export function AlertsTab({ review, decisions, onOpenAlert, onSearchDocuments }: AlertsTabProps) {
  const { t } = useI18n();
  const { filters, setFilters, selectedNumber, select } = useResultsView();
  const { visible, groups, hiddenCount } = useVisibleAlerts(review, filters);
  const actionsFor = useRowActions(decisions, onOpenAlert);
  const searchRef = useRef<HTMLInputElement>(null);
  const position = visible.findIndex((alert) => alert.number === selectedNumber);
  const move = (step: number) => {
    const next = visible[Math.min(Math.max(position + step, 0), visible.length - 1)];
    if (next) select(next.number);
  };
  useDecisionShortcuts({
    alertNumber: selectedNumber ?? undefined,
    decisions,
    onNext: () => {
      move(1);
    },
    onPrevious: () => {
      move(position < 0 ? 1 : -1);
    },
    extra: [{ key: SEARCH_KEY, run: () => searchRef.current?.focus() }],
  });

  return (
    <>
      <div className={styles.controls}>
        <AlertsToolbar
          review={review}
          query={filters.query}
          searchRef={searchRef}
          onQueryChange={(query) => {
            setFilters({ ...filters, query });
          }}
        />
        <AlertFiltersBar
          review={review}
          filters={filters}
          visibleCount={visible.length}
          onChange={setFilters}
        />
      </div>
      <div className={styles.listArea}>
        {visible.length > 0 ? (
          <AlertList
            groups={groups}
            selectedId={selectedNumber === null ? undefined : String(selectedNumber)}
            onSelect={(id) => {
              onOpenAlert(Number(id));
            }}
            onHighlight={(id) => {
              select(Number(id));
            }}
            actionsFor={actionsFor}
          />
        ) : (
          <NoMatchingAlerts
            filters={filters}
            onChange={setFilters}
            onSearchDocuments={onSearchDocuments}
          />
        )}
        {hiddenCount > 0 && visible.length > 0 && (
          <p className={styles.hiddenNote}>
            <Icon name="filter_alt_off" size="sm" />
            {t("results.hiddenByFilters", { count: hiddenCount })}
          </p>
        )}
      </div>
      <ShortcutBar
        hints={[
          { keys: ["J", "K"], label: t("shortcuts.move") },
          { keys: ["↵"], label: t("shortcuts.open") },
          { keys: ["C", "E", "I"], label: t("shortcuts.decide") },
          { keys: [SEARCH_KEY], label: t("shortcuts.search") },
          { keys: UNDO_KEYS, label: t("shortcuts.undo") },
        ]}
      />
    </>
  );
}
