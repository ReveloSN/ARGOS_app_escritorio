import type { ChangeResult, SegmentResult } from "../../services/engine/comparisonTypes";
import { panelSegments, type PanelSide, type TextRun } from "../comparison/segmentRuns";

/** El texto de un documento con la diferencia marcada, o null si ahí no aparece. */
export interface SideValue {
  readonly document: string;
  readonly runs: readonly TextRun[] | null;
}

export interface SideBySide {
  readonly first: SideValue;
  readonly second: SideValue;
}

interface PairNames {
  readonly firstDocument: string;
  readonly secondDocument: string;
}

function runsOf(
  change: ChangeResult,
  segment: SegmentResult | null,
  side: PanelSide,
): readonly TextRun[] | null {
  if (!segment) return null;
  return panelSegments([segment], [change], side)[0]?.runs ?? null;
}

/** «Documento A dice» y «Documento B dice»: lo mismo que ya marca el panel de cada documento. */
export function changeSideValues(change: ChangeResult, pair: PairNames): SideBySide {
  return {
    first: { document: pair.firstDocument, runs: runsOf(change, change.first, "first") },
    second: { document: pair.secondDocument, runs: runsOf(change, change.second, "second") },
  };
}
