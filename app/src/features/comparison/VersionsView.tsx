import { useEffect } from "react";

import { ErrorMessage } from "../../components/molecules/ErrorMessage";
import { useI18n } from "../../i18n/i18nContext";
import type { ComparisonResult, PairComparisonResult } from "../../services/engine/comparisonTypes";
import type { AlertDecisions } from "../alerts/useAlertDecisions";
import { shownChanges, visibleChanges } from "./changeFilters";
import { ChangeList } from "./ChangeList";
import { ChangeMinimap } from "./ChangeMinimap";
import styles from "./Compare.module.css";
import { DocumentPanel } from "./DocumentPanel";
import { ItemDetail } from "./ItemDetail";
import { changeDetail } from "./itemDetails";
import { panelSegments } from "./segmentRuns";
import type { ComparisonView } from "./useComparisonView";
import { useSyncedScroll } from "./useSyncedScroll";

interface VersionsViewProps {
  readonly comparison: ComparisonResult;
  readonly pair: PairComparisonResult;
  readonly view: ComparisonView;
  readonly decisions: AlertDecisions;
}

/** Al elegir un cambio desde la lista o el minimapa, los dos paneles lo traen a la vista. */
function useScrollToSelected(selected: number | undefined) {
  useEffect(() => {
    if (selected === undefined) return;
    document.querySelectorAll(`[data-change="${String(selected)}"]`).forEach((element) => {
      element.scrollIntoView({ block: "center" });
    });
  }, [selected]);
}

function UnrelatedVersions({ view }: { view: ComparisonView }) {
  const { t } = useI18n();
  return (
    <ErrorMessage
      tone="neutral"
      what={t("comparison.unrelated.what")}
      why={t("comparison.unrelated.why")}
      todo={t("comparison.unrelated.todo")}
      primaryAction={{
        label: t("comparison.unrelated.action"),
        onClick: () => {
          view.setTab("inconsistencies");
        },
      }}
    />
  );
}

/** Comparar versiones: dos paneles sincronizados, minimapa, lista de cambios y su detalle. */
export function VersionsView({ comparison, pair, view, decisions }: VersionsViewProps) {
  const { t } = useI18n();
  const scroll = useSyncedScroll();
  useScrollToSelected(view.selected);
  if (pair.seemsUnrelated) return <UnrelatedVersions view={view} />;
  const shown = shownChanges(pair.changes, view.filters.ignored);
  const selectedChange = shown.find((change) => change.number === view.selected);
  const decisionOf = (number: number) =>
    comparison.decisions.decisions.find((decision) => decision.alertNumber === number);
  return (
    <div className={styles.versions}>
      <div className={styles.panels}>
        <DocumentPanel
          side="first"
          document={pair.firstDocument}
          segments={panelSegments(pair.firstSegments, shown, "first")}
          selected={view.selected}
          onSelect={view.select}
          scrollRef={scroll.first}
          onScroll={scroll.onFirstScroll}
        />
        <DocumentPanel
          side="second"
          document={pair.secondDocument}
          segments={panelSegments(pair.secondSegments, shown, "second")}
          selected={view.selected}
          onSelect={view.select}
          scrollRef={scroll.second}
          onScroll={scroll.onSecondScroll}
        />
        <ChangeMinimap
          pair={pair}
          changes={shown}
          selected={view.selected}
          viewport={scroll.viewport}
          onSelect={view.select}
        />
      </div>
      <aside className={styles.aside}>
        <ChangeList
          shown={shown}
          visible={visibleChanges(pair.changes, view.filters)}
          filters={view.filters}
          decisions={comparison.decisions.decisions}
          selected={view.selected}
          onFilters={view.setFilters}
          onSelect={view.select}
        />
        {selectedChange && (
          <ItemDetail
            content={changeDetail(selectedChange, t)}
            decision={decisionOf(selectedChange.number)}
            decisions={decisions}
          />
        )}
      </aside>
    </div>
  );
}
