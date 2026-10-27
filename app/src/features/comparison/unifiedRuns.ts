import type {
  ChangeResult,
  TextSpanResult,
  WordEditResult,
} from "../../services/engine/comparisonTypes";

export type UnifiedMarkKind = "removed" | "added";

/** Un tramo del texto unificado: sin marca, o eliminado (A) o agregado (B). */
export interface UnifiedRun {
  readonly text: string;
  readonly mark?: UnifiedMarkKind;
  readonly changeNumber?: number;
  readonly isHighRisk?: boolean;
}

export interface MovedNote {
  readonly change: ChangeResult;
  readonly isDestination: boolean;
}

export interface UnifiedParagraph {
  readonly key: string;
  readonly runs: readonly UnifiedRun[];
  /** El cambio de lugar de este párrafo: en el sitio que dejó no trae texto, solo la nota. */
  readonly moved?: MovedNote | undefined;
  readonly changeNumbers: readonly number[];
}

export function markedRun(text: string, mark: UnifiedMarkKind, change: ChangeResult): UnifiedRun {
  return { text, mark, changeNumber: change.number, isHighRisk: change.risk === "high" };
}

export function isMovedChange(change: ChangeResult): boolean {
  return change.kind === "moved" || change.isMoved;
}

/** Hasta dónde se ha leído cada texto mientras se recorren las ediciones. */
interface TextCursors {
  readonly first: number;
  readonly second: number;
}

/** Cuánto texto igual hay antes de la edición; una edición sin un lado lo toma del otro. */
function equalLength(edit: WordEditResult, cursors: TextCursors): number {
  if (edit.first) return edit.first.start - cursors.first;
  return (edit.second?.start ?? cursors.second) - cursors.second;
}

function emptyAt(position: number): TextSpanResult {
  return { start: position, end: position };
}

interface MergedTexts {
  readonly change: ChangeResult;
  readonly first: string;
  readonly second: string;
}

/** Texto igual en A y en B y, entre medias, lo que A perdió y lo que B ganó. */
export function mergedRuns({ change, first, second }: MergedTexts): UnifiedRun[] {
  const runs: UnifiedRun[] = [];
  let cursors: TextCursors = { first: 0, second: 0 };
  for (const edit of change.edits) {
    const equal = equalLength(edit, cursors);
    const removed = edit.first ?? emptyAt(cursors.first + equal);
    const added = edit.second ?? emptyAt(cursors.second + equal);
    runs.push({ text: first.slice(cursors.first, removed.start) });
    runs.push(markedRun(first.slice(removed.start, removed.end), "removed", change));
    runs.push(markedRun(second.slice(added.start, added.end), "added", change));
    cursors = { first: removed.end, second: added.end };
  }
  runs.push({ text: first.slice(cursors.first) });
  return runs.filter((run) => run.text !== "");
}
