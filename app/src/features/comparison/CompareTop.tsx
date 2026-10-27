import type { ReactNode } from "react";

import { Icon } from "../../components/atoms/Icon";
import { useI18n } from "../../i18n/i18nContext";
import type { ComparisonResult } from "../../services/engine/comparisonTypes";
import styles from "./Compare.module.css";
import { CompareHeader } from "./CompareHeader";
import { changeCountsByDocument } from "./comparisonScope";
import { DocumentBreakdown } from "./DocumentBreakdown";
import { ScopeSelector } from "./ScopeSelector";
import type { ScopedList } from "./scopedList";
import type { ComparisonView } from "./useComparisonView";
import { VersionsToolbar } from "./VersionsToolbar";

interface CompareTopProps {
  readonly comparison: ComparisonResult;
  readonly view: ComparisonView;
  readonly list: ScopedList;
  readonly crumb: string;
  readonly onClose: () => void;
}

/** Qué se compara: «A → B» con un documento concreto, o el base frente a todos los demás. */
function ScopeHeading({ comparison, view }: Pick<CompareTopProps, "comparison" | "view">) {
  const { t } = useI18n();
  const pair = comparison.pairs[view.pairIndex];
  if (view.scope.against.kind === "all") {
    return (
      <>
        <span className={styles.sideBadge}>{t("comparison.scope.baseBadge")}</span>
        <span className={styles.documentName}>{view.scope.base}</span>
      </>
    );
  }
  return (
    <>
      <span className={styles.sideBadge}>{t("comparison.sideA")}</span>
      <span className={styles.documentName}>{pair?.firstDocument}</span>
      <Icon name="arrow_forward" size="sm" />
      <span className={styles.sideBadge}>{t("comparison.sideB")}</span>
      <span className={styles.documentName}>{pair?.secondDocument}</span>
    </>
  );
}

function VersionsTop({
  comparison,
  view,
  list,
}: Omit<CompareTopProps, "crumb" | "onClose">): ReactNode {
  const isAgainstAll = view.scope.against.kind === "all";
  return (
    <>
      <VersionsToolbar
        heading={<ScopeHeading comparison={comparison} view={view} />}
        options={{
          changes: list.shown.map((item) => item.change),
          filters: view.filters,
          onFilters: view.setFilters,
          scopeSelector: (
            <ScopeSelector comparison={comparison} scope={view.scope} onScope={view.setScope} />
          ),
          isMinimapShown: view.isMinimapShown,
          onMinimapShown: view.setMinimapShown,
          onOpenMatrix: () => {
            view.setTab("matrix");
          },
        }}
      />
      {isAgainstAll && (
        <DocumentBreakdown documents={changeCountsByDocument(comparison, view.scope, list.shown)} />
      )}
    </>
  );
}

/** Lo fijo de arriba: título y modos, «Cerrar comparación» y, en versiones, el alcance. */
export function CompareTop(props: CompareTopProps) {
  const { view } = props;
  return (
    <div className={styles.top}>
      <CompareHeader
        tab={view.tab}
        crumb={props.crumb}
        onTab={view.setTab}
        onClose={props.onClose}
      />
      {view.tab === "versions" && <VersionsTop {...props} />}
    </div>
  );
}
