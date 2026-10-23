import type { CSSProperties } from "react";

import { joinClassNames } from "../../components/joinClassNames";
import { useI18n } from "../../i18n/i18nContext";
import type { ChangeResult, PairComparisonResult } from "../../services/engine/comparisonTypes";
import { CHANGE_KIND_APPEARANCE, changeSegment } from "./changePresentation";
import styles from "./Compare.module.css";
import type { Viewport } from "./useSyncedScroll";

const PERCENT = 100;

interface ChangeMinimapProps {
  readonly pair: PairComparisonResult;
  readonly changes: readonly ChangeResult[];
  readonly selected: number | undefined;
  readonly viewport: Viewport;
  readonly onSelect: (number: number) => void;
}

/** Posición del cambio en el documento, de 0 a 1 (lo eliminado, según el documento A). */
function positionOf(change: ChangeResult, pair: PairComparisonResult): number {
  const segment = changeSegment(change);
  const total = change.second ? pair.secondSegments.length : pair.firstSegments.length;
  return segment && total ? (segment.position - 1) / total : 0;
}

/** Minimapa: dónde están los cambios en todo el documento y qué parte se está viendo. */
export function ChangeMinimap({ pair, changes, selected, viewport, onSelect }: ChangeMinimapProps) {
  const { t } = useI18n();
  const viewportStyle: CSSProperties = {
    top: `${String(viewport.top * PERCENT)}%`,
    height: `${String(viewport.height * PERCENT)}%`,
  };
  return (
    <nav aria-label={t("comparison.minimap")} className={styles.minimap}>
      <div className={styles.minimapViewport} style={viewportStyle} />
      {changes.map((change) => (
        <button
          key={change.number}
          type="button"
          title={`${String(change.number)}. ${t(CHANGE_KIND_APPEARANCE[change.kind].label)}`}
          aria-label={`${String(change.number)}. ${t(CHANGE_KIND_APPEARANCE[change.kind].label)}`}
          className={joinClassNames(
            styles.minimapMark,
            styles[change.kind],
            selected === change.number && styles.minimapSelected,
          )}
          style={{ top: `${String(positionOf(change, pair) * PERCENT)}%` }}
          onClick={() => {
            onSelect(change.number);
          }}
        />
      ))}
    </nav>
  );
}
