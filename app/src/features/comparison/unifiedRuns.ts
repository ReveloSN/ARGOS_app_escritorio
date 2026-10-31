import type {
  ChangeResult,
  ChangeTopicValue,
  TextSpanResult,
  WordEditResult,
} from "../../services/engine/comparisonTypes";

import { differingCores, type DifferingCore } from "./differingCore";

export type UnifiedMarkKind = "removed" | "added";

/** Montos, fechas e identificadores: se leen carácter a carácter, así que van en monoespaciada. */
const DATA_TOPICS: ReadonlySet<ChangeTopicValue> = new Set(["amount", "date", "number"]);

/** Un tramo del texto unificado: sin marca, o eliminado (A) o agregado (B). */
export interface UnifiedRun {
  readonly text: string;
  readonly mark?: UnifiedMarkKind;
  readonly changeNumber?: number;
  readonly isHighRisk?: boolean;
  /** Dato (monto, fecha, identificador): tipografía monoespaciada. */
  readonly isData?: boolean;
  readonly core?: DifferingCore;
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

const SINGLE_TOKEN = /^\S+$/;

/** Un monto, fecha o identificador suelto va en monoespaciada y marca los caracteres que cambiaron. */
function asData(run: UnifiedRun, change: ChangeResult, core?: DifferingCore): UnifiedRun {
  if (!DATA_TOPICS.has(change.topic) || !SINGLE_TOKEN.test(run.text)) return run;
  return { ...run, isData: true, ...(core && { core }) };
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

/** Lo que A perdió y lo que B ganó en una edición; el lado que falta queda vacío, en su sitio. */
function editSpans(edit: WordEditResult, cursors: TextCursors) {
  const equal = equalLength(edit, cursors);
  return {
    removed: edit.first ?? emptyAt(cursors.first + equal),
    added: edit.second ?? emptyAt(cursors.second + equal),
  };
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
    const { removed, added } = editSpans(edit, cursors);
    const before = first.slice(removed.start, removed.end);
    const after = second.slice(added.start, added.end);
    const cores = differingCores(before, after);
    runs.push({ text: first.slice(cursors.first, removed.start) });
    runs.push(asData(markedRun(before, "removed", change), change, cores?.first));
    runs.push(asData(markedRun(after, "added", change), change, cores?.second));
    cursors = { first: removed.end, second: added.end };
  }
  runs.push({ text: first.slice(cursors.first) });
  return runs.filter((run) => run.text !== "");
}
