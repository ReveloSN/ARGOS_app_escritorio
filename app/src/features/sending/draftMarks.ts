import type { RiskLevelValue } from "../../services/engine/reviewTypes";

/** Un texto marcado en el borrador: el número del problema y su riesgo. */
export interface DraftMark {
  readonly text: string;
  readonly number: number;
  readonly risk: RiskLevelValue;
}

export type MarkRun =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "mark"; readonly text: string; readonly mark: DraftMark };

interface Found {
  readonly start: number;
  readonly mark: DraftMark;
}

function firstMarks(text: string, marks: readonly DraftMark[]): Found[] {
  const found = marks
    .map((mark) => ({ start: text.indexOf(mark.text), mark }))
    .filter((item) => item.start >= 0);
  return found.sort((a, b) => a.start - b.start);
}

/** El texto partido en tramos normales y marcados; cada marca, en su primera aparición. */
export function markRuns(text: string, marks: readonly DraftMark[]): MarkRun[] {
  const runs: MarkRun[] = [];
  let cursor = 0;
  for (const { start, mark } of firstMarks(text, marks)) {
    if (start < cursor) continue;
    if (start > cursor) runs.push({ kind: "text", text: text.slice(cursor, start) });
    runs.push({ kind: "mark", text: mark.text, mark });
    cursor = start + mark.text.length;
  }
  if (cursor < text.length) runs.push({ kind: "text", text: text.slice(cursor) });
  return runs;
}

/** Los párrafos del cuerpo: un bloque por línea con texto. */
export function paragraphsOf(body: string): string[] {
  return body.split(/\n+/).filter((line) => line.trim() !== "");
}
