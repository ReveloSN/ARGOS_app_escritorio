import type { DiffMarkKind } from "../../components/atoms/DiffMark";
import type {
  ChangeResult,
  EditKindValue,
  SegmentResult,
  TextSpanResult,
} from "../../services/engine/comparisonTypes";

export type PanelSide = "first" | "second";

/** Un tramo del texto de un panel: sin marca, o marcado como falta, agregado o cambiado. */
export interface TextRun {
  readonly text: string;
  readonly mark?: DiffMarkKind;
  readonly changeNumber?: number;
}

/** Un segmento listo para el panel: sus tramos y, si cambió de lugar, ese cambio. */
export interface PanelSegment {
  readonly segment: SegmentResult;
  readonly runs: readonly TextRun[];
  readonly moved: ChangeResult | undefined;
  readonly changeNumbers: readonly number[];
}

interface Mark {
  readonly span: TextSpanResult;
  readonly kind: DiffMarkKind;
  readonly changeNumber: number;
}

// Qué marca deja cada edición de palabras en cada lado (en el otro lado no deja nada).
const EDIT_MARKS: Readonly<Record<PanelSide, Partial<Record<EditKindValue, DiffMarkKind>>>> = {
  first: { deleted: "removed", replaced: "changed" },
  second: { inserted: "added", replaced: "changed" },
};
const WHOLE_SEGMENT_MARK = { first: "removed", second: "added" } as const;
const WHOLE_SEGMENT_KIND = { first: "removed", second: "added" } as const;

function segmentOf(change: ChangeResult, side: PanelSide): SegmentResult | null {
  return side === "first" ? change.first : change.second;
}

function marksOf(change: ChangeResult, side: PanelSide, textLength: number): Mark[] {
  if (change.kind === WHOLE_SEGMENT_KIND[side]) {
    const span = { start: 0, end: textLength };
    return [{ span, kind: WHOLE_SEGMENT_MARK[side], changeNumber: change.number }];
  }
  return change.edits.flatMap((edit) => {
    const kind = EDIT_MARKS[side][edit.kind];
    const span = edit[side];
    return kind && span ? [{ span, kind, changeNumber: change.number }] : [];
  });
}

/** Corta el texto en tramos según las marcas (que no se superponen dentro de un segmento). */
export function textRuns(text: string, marks: readonly Mark[]): TextRun[] {
  const sorted = [...marks].sort((a, b) => a.span.start - b.span.start);
  const runs: TextRun[] = [];
  let cursor = 0;
  for (const mark of sorted) {
    if (mark.span.start > cursor) runs.push({ text: text.slice(cursor, mark.span.start) });
    const markedText = text.slice(mark.span.start, mark.span.end);
    runs.push({ text: markedText, mark: mark.kind, changeNumber: mark.changeNumber });
    cursor = mark.span.end;
  }
  if (cursor < text.length) runs.push({ text: text.slice(cursor) });
  return runs;
}

/** Los segmentos de un lado con las marcas de los cambios visibles que los tocan. */
export function panelSegments(
  segments: readonly SegmentResult[],
  changes: readonly ChangeResult[],
  side: PanelSide,
): PanelSegment[] {
  return segments.map((segment) => {
    const touching = changes.filter(
      (change) => segmentOf(change, side)?.position === segment.position,
    );
    const marks = touching.flatMap((change) => marksOf(change, side, segment.text.length));
    return {
      segment,
      runs: textRuns(segment.text, marks),
      moved: touching.find((change) => change.kind === "moved" || change.isMoved),
      changeNumbers: touching.map((change) => change.number),
    };
  });
}
