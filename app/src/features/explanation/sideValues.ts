import type { ChangeResult, SegmentResult } from "../../services/engine/comparisonTypes";
import { panelSegments, type PanelSide, type TextRun } from "../comparison/segmentRuns";

/** El texto de un documento con la diferencia marcada, o null si ahí no aparece. */
export interface SideValue {
  readonly document: string;
  readonly runs: readonly TextRun[] | null;
  /** Página o sección de donde sale el valor; sin segmento no hay valor ni origen. */
  readonly location: string | null;
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

export type DescribeSegment = (segment: SegmentResult) => string;

function sideOf(
  change: ChangeResult,
  input: { document: string; side: PanelSide },
  locate: DescribeSegment,
): SideValue {
  const segment = input.side === "first" ? change.first : change.second;
  return {
    document: input.document,
    runs: runsOf(change, segment, input.side),
    location: segment ? locate(segment) : null,
  };
}

/** «Documento A dice» y «Documento B dice»: lo mismo que ya marca el panel de cada documento. */
export function changeSideValues(
  change: ChangeResult,
  pair: PairNames,
  locate: DescribeSegment = () => "",
): SideBySide {
  return {
    first: sideOf(change, { document: pair.firstDocument, side: "first" }, locate),
    second: sideOf(change, { document: pair.secondDocument, side: "second" }, locate),
  };
}
