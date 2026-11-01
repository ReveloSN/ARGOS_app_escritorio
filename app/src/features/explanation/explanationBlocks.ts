import type { ChangeKindValue, ChangeResult } from "../../services/engine/comparisonTypes";
import type { ExplanationStructureResult } from "../../services/engine/aiTypes";
import type { TranslationKey } from "../../i18n/translate";
import type { Translate } from "../alerts/alertPresentation";
import { changeValues, editedValues } from "../comparison/changePresentation";

/** Lo que se lee en cinco segundos: una frase y tres bloques cortos con títulos fijos. */
export interface ExplanationBlocks {
  readonly summary: string;
  readonly changed: string;
  readonly why: string;
  readonly todo: string;
}

// La frase resumen cita solo el inicio del texto; el texto completo está en los valores.
const MAX_QUOTED_CHARACTERS = 80;
const ELLIPSIS = "…";

const SUMMARY_KEYS: Readonly<Record<ChangeKindValue, TranslationKey>> = {
  removed: "explainPanel.summary.removed",
  added: "explainPanel.summary.added",
  modified: "explainPanel.summary.modified",
  moved: "explainPanel.summary.moved",
};

export function shorten(text: string): string {
  if (text.length <= MAX_QUOTED_CHARACTERS) return text;
  return `${text.slice(0, MAX_QUOTED_CHARACTERS)}${ELLIPSIS}`;
}

/** Una palabra que solo se agrega o solo se quita se dice así: «se agregó «no»», no la oración entera. */
function wordSummary(change: ChangeResult, t: Translate): string | undefined {
  const { before, after } = editedValues(change);
  if (change.kind !== "modified" || Boolean(before) === Boolean(after)) return undefined;
  return after
    ? t(SUMMARY_KEYS.added, { text: shorten(after) })
    : t(SUMMARY_KEYS.removed, { text: shorten(before) });
}

function changeSummary(change: ChangeResult, t: Translate): string {
  const wordsOnly = wordSummary(change, t);
  if (wordsOnly) return wordsOnly;
  const values = changeValues(change);
  return t(SUMMARY_KEYS[change.kind], {
    text: shorten(values.before || values.after),
    before: shorten(values.before),
    after: shorten(values.after),
  });
}

/** La plantilla de respaldo de un cambio: funciona sin clave y sin conexión. */
export function changeBlocks(change: ChangeResult, t: Translate): ExplanationBlocks {
  const topic = change.topic;
  return {
    summary: changeSummary(change, t),
    changed: t(`explainPanel.topics.${topic}.changed`),
    why: t(`explainPanel.topics.${topic}.why`),
    todo: t(`explainPanel.topics.${topic}.todo`),
  };
}

/** Si la IA entregó los cuatro bloques, ocupan el lugar de la plantilla; si no, queda esta. */
export function withAiStructure(
  local: ExplanationBlocks,
  structure: ExplanationStructureResult | null,
): ExplanationBlocks {
  if (!structure) return local;
  return {
    summary: structure.summary,
    changed: structure.whatChanged,
    why: structure.whyItMatters,
    todo: structure.whatToDo,
  };
}
