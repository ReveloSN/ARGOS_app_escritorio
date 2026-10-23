import type { TranslationKey } from "../../i18n/translate";
import type {
  ChangeKindValue,
  ChangeResult,
  SegmentResult,
} from "../../services/engine/comparisonTypes";

export interface ChangeKindAppearance {
  readonly label: TranslationKey;
  readonly icon: string;
}

// Íconos del mockup Comparar: cada tipo de cambio tiene uno propio, además de su etiqueta.
export const CHANGE_KIND_APPEARANCE: Readonly<Record<ChangeKindValue, ChangeKindAppearance>> = {
  removed: { label: "comparison.kind.removed", icon: "remove" },
  added: { label: "comparison.kind.added", icon: "add" },
  modified: { label: "comparison.kind.modified", icon: "swap_horiz" },
  moved: { label: "comparison.kind.moved", icon: "swap_vert" },
};

const EDIT_SEPARATOR = " … ";

/** Lo que había antes y lo que hay después, para la lista y el detalle de un cambio. */
export interface ChangeValues {
  readonly before: string;
  readonly after: string;
}

// Un segmento entero: qué lado se muestra según el tipo (el movido se cita como estaba).
const WHOLE_SEGMENT_SIDES: Readonly<
  Record<Exclude<ChangeKindValue, "modified">, Readonly<Record<keyof ChangeValues, boolean>>>
> = {
  removed: { before: true, after: false },
  added: { before: false, after: true },
  moved: { before: true, after: false },
};

function joinedEdits(change: ChangeResult, side: "firstText" | "secondText"): string {
  return change.edits
    .map((edit) => edit[side])
    .filter(Boolean)
    .join(EDIT_SEPARATOR);
}

function textIf(isShown: boolean, segment: SegmentResult | null): string {
  return isShown && segment ? segment.text : "";
}

export function changeValues(change: ChangeResult): ChangeValues {
  if (change.kind === "modified") {
    return { before: joinedEdits(change, "firstText"), after: joinedEdits(change, "secondText") };
  }
  const sides = WHOLE_SEGMENT_SIDES[change.kind];
  return { before: textIf(sides.before, change.first), after: textIf(sides.after, change.second) };
}

/** El segmento que ubica el cambio: el del documento nuevo, o el anterior si se eliminó. */
export function changeSegment(change: ChangeResult): SegmentResult | null {
  return change.second ?? change.first;
}
