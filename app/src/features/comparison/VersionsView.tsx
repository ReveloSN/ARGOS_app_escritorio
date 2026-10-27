import { useEffect } from "react";

import { joinClassNames } from "../../components/joinClassNames";
import { ErrorMessage } from "../../components/molecules/ErrorMessage";
import { useI18n } from "../../i18n/i18nContext";
import type { ComparisonResult, PairComparisonResult } from "../../services/engine/comparisonTypes";
import type { AlertDecisions } from "../alerts/useAlertDecisions";
import { ChangeList } from "./ChangeList";
import { changeCountsByDocument } from "./comparisonScope";
import { DocumentFilterChips } from "./DocumentFilterChips";
import { ChangeMinimap } from "./ChangeMinimap";
import styles from "./Compare.module.css";
import { UnifiedDocument } from "./UnifiedDocument";
import { ItemDetail } from "./ItemDetail";
import { changeDetail } from "./itemDetails";
import type { ScopedList } from "./scopedList";
import type { ComparisonView } from "./useComparisonView";
import { useSyncedScroll } from "./useSyncedScroll";

interface VersionsViewProps {
  readonly comparison: ComparisonResult;
  readonly pair: PairComparisonResult;
  readonly list: ScopedList;
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
export function VersionsView({ comparison, pair, list, view, decisions }: VersionsViewProps) {
  const { t } = useI18n();
  const scroll = useSyncedScroll();
  useScrollToSelected(view.selected);
  if (pair.seemsUnrelated) return <UnrelatedVersions view={view} />;
  const shown = list.pairChanges;
  const selectedChange = list.selected;
  const decisionOf = (number: number) =>
    comparison.decisions.decisions.find((decision) => decision.alertNumber === number);
  return (
    <div className={styles.versions}>
      <div
        className={joinClassNames(styles.panels, view.isMinimapShown && styles.panelsWithMinimap)}
      >
        <UnifiedDocument
          pair={pair}
          changes={shown}
          selected={view.selected}
          onSelect={view.select}
          scrollRef={scroll.second}
          onScroll={scroll.onSecondScroll}
        />
        {view.isMinimapShown && (
          <ChangeMinimap
            pair={pair}
            changes={shown}
            selected={view.selected}
            viewport={scroll.viewport}
            onSelect={view.select}
          />
        )}
      </div>
      <aside className={styles.aside}>
        {view.scope.against.kind === "all" && (
          <DocumentFilterChips
            documents={changeCountsByDocument(comparison, view.scope, list.shown)}
            selected={view.documentFilter}
            onSelect={view.setDocumentFilter}
          />
        )}
        <ChangeList
          shown={list.shown.map((item) => item.change)}
          visible={list.visible}
          againstByChange={view.scope.against.kind === "all" ? list.againstByChange : undefined}
          decisions={comparison.decisions.decisions}
          selected={view.selected}
          onSelect={view.select}
        />
        {selectedChange && (
          <ItemDetail
            content={changeDetail({ change: selectedChange, pair, comparisonId: comparison.id }, t)}
            decision={decisionOf(selectedChange.number)}
            decisions={decisions}
          />
        )}
      </aside>
    </div>
  );
}
