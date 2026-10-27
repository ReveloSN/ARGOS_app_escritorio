import type {
  ChangeResult,
  PairComparisonResult,
  SegmentResult,
} from "../../services/engine/comparisonTypes";
import {
  isMovedChange,
  markedRun,
  mergedRuns,
  type UnifiedParagraph,
  type UnifiedRun,
} from "./unifiedRuns";

export type { UnifiedMarkKind, UnifiedParagraph, UnifiedRun } from "./unifiedRuns";

/** Dónde está cada segmento en los cambios del par y cuáles quedaron a la vista. */
interface ChangeIndex {
  readonly byFirst: ReadonlyMap<number, ChangeResult>;
  readonly bySecond: ReadonlyMap<number, ChangeResult>;
  readonly shown: ReadonlySet<number>;
}

function indexChanges(all: readonly ChangeResult[], shown: readonly ChangeResult[]): ChangeIndex {
  const byFirst = new Map<number, ChangeResult>();
  const bySecond = new Map<number, ChangeResult>();
  all.forEach((change) => {
    if (change.first) byFirst.set(change.first.position, change);
    if (change.second) bySecond.set(change.second.position, change);
  });
  return { byFirst, bySecond, shown: new Set(shown.map((change) => change.number)) };
}

/** Los dos segmentos que toca el recorrido y el cambio de cada uno. */
interface Cursor {
  readonly first: SegmentResult | undefined;
  readonly second: SegmentResult | undefined;
  readonly ofFirst: ChangeResult | undefined;
  readonly ofSecond: ChangeResult | undefined;
  readonly shown: ReadonlySet<number>;
}

function shownOf(change: ChangeResult | undefined, shown: ReadonlySet<number>) {
  return change && shown.has(change.number) ? change : undefined;
}

function wholeParagraph(segment: SegmentResult, side: "a" | "b", change?: ChangeResult) {
  const key = `${side}${String(segment.position)}`;
  const mark = side === "a" ? "removed" : "added";
  const runs = change ? [markedRun(segment.text, mark, change)] : [{ text: segment.text }];
  return { key, runs, changeNumbers: change ? [change.number] : [] };
}

function removedParagraph({ first, ofFirst, shown }: Cursor): UnifiedParagraph | undefined {
  const change = shownOf(ofFirst, shown);
  return first && change ? wholeParagraph(first, "a", change) : undefined;
}

function addedParagraph({ second, ofSecond, shown }: Cursor): UnifiedParagraph | undefined {
  return second ? wholeParagraph(second, "b", shownOf(ofSecond, shown)) : undefined;
}

function movedAwayParagraph({ first, ofFirst, shown }: Cursor): UnifiedParagraph | undefined {
  const change = shownOf(ofFirst, shown);
  if (!first || !change) return undefined;
  const moved = { change, isDestination: false };
  return { key: `a${String(first.position)}`, runs: [], moved, changeNumbers: [change.number] };
}

function textRunsOf(change: ChangeResult, second: SegmentResult): UnifiedRun[] {
  const first = change.first;
  if (change.kind !== "modified" || !first || !change.second) return [{ text: second.text }];
  return mergedRuns({ change, first: first.text, second: change.second.text });
}

function pairedParagraph({ second, ofSecond, shown }: Cursor): UnifiedParagraph | undefined {
  if (!second) return undefined;
  const change = shownOf(ofSecond, shown);
  const key = `b${String(second.position)}`;
  if (!change) return { key, runs: [{ text: second.text }], changeNumbers: [] };
  const moved = isMovedChange(change) ? { change, isDestination: true } : undefined;
  return { key, runs: textRunsOf(change, second), moved, changeNumbers: [change.number] };
}

type SegmentRole = "removed" | "added" | "moved" | undefined;

function roleOf(change: ChangeResult | undefined): SegmentRole {
  if (!change) return undefined;
  if (isMovedChange(change)) return "moved";
  return change.kind === "removed" || change.kind === "added" ? change.kind : undefined;
}

type StepKind = "removed" | "added" | "movedAway" | "movedHere" | "paired";

function stepKind({ ofFirst, ofSecond }: Cursor): StepKind {
  const [first, second] = [roleOf(ofFirst), roleOf(ofSecond)];
  const candidates: readonly (readonly [boolean, StepKind])[] = [
    [first === "removed", "removed"],
    [second === "added", "added"],
    [first === "moved", "movedAway"],
    [second === "moved", "movedHere"],
  ];
  return candidates.find(([matches]) => matches)?.[1] ?? "paired";
}

interface Step {
  readonly build: (cursor: Cursor) => UnifiedParagraph | undefined;
  /** Cuántos segmentos de A y de B consume el paso. */
  readonly consumes: readonly [number, number];
}

const STEPS: Readonly<Record<StepKind, Step>> = {
  removed: { build: removedParagraph, consumes: [1, 0] },
  added: { build: addedParagraph, consumes: [0, 1] },
  movedAway: { build: movedAwayParagraph, consumes: [1, 0] },
  movedHere: { build: pairedParagraph, consumes: [0, 1] },
  paired: { build: pairedParagraph, consumes: [1, 1] },
};

function cursorAt(
  pair: PairComparisonResult,
  index: ChangeIndex,
  at: readonly [number, number],
): Cursor {
  const first = pair.firstSegments[at[0]];
  const second = pair.secondSegments[at[1]];
  return {
    first,
    second,
    ofFirst: first && index.byFirst.get(first.position),
    ofSecond: second && index.bySecond.get(second.position),
    shown: index.shown,
  };
}

/**
 * Un solo texto con los dos documentos: lo eliminado de A (tachado), lo agregado de B
 * (subrayado) y, donde un párrafo cambió de lugar, una nota en el sitio que dejó.
 * Recorre A y B a la vez; los cambios ocultos por los filtros se leen como en B.
 */
export function unifiedParagraphs(
  pair: PairComparisonResult,
  shown: readonly ChangeResult[],
): UnifiedParagraph[] {
  const index = indexChanges(pair.changes, shown);
  const paragraphs: UnifiedParagraph[] = [];
  let at: readonly [number, number] = [0, 0];
  while (at[0] < pair.firstSegments.length || at[1] < pair.secondSegments.length) {
    const cursor = cursorAt(pair, index, at);
    const step = STEPS[stepKind(cursor)];
    const paragraph = step.build(cursor);
    if (paragraph) paragraphs.push(paragraph);
    at = [at[0] + step.consumes[0], at[1] + step.consumes[1]];
  }
  return paragraphs;
}
