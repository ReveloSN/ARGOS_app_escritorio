import type { I18n } from "../../i18n/i18nContext";
import type { PluralKey, TranslationKey } from "../../i18n/translate";
import type { AssistantCondition, AssistantStatus } from "./assistantStatus";

type TextContext = Pick<I18n, "t" | "tPlural">;
type CountedCondition = "unreadable" | "highRisk";
type PlainCondition = Exclude<AssistantCondition, CountedCondition | "reading">;

const COUNTED: Readonly<Record<CountedCondition, PluralKey>> = {
  unreadable: "assistant.status.unreadable",
  highRisk: "assistant.status.highRisk",
};
const PLAIN: Readonly<Record<PlainCondition, TranslationKey>> = {
  starting: "assistant.status.starting",
  paused: "assistant.status.paused",
  explaining: "assistant.status.explaining",
  ready: "assistant.status.ready",
  needsConfirmation: "assistant.status.needsConfirmation",
  clear: "assistant.status.clear",
};
/** En la barra superior no hay título «Asistente de IA»: estos textos lo incluyen. */
const TOPBAR: Partial<Readonly<Record<AssistantCondition, TranslationKey>>> = {
  starting: "assistant.topbar.starting",
  paused: "assistant.topbar.paused",
  ready: "assistant.topbar.ready",
};

function isCounted(condition: AssistantCondition): condition is CountedCondition {
  return condition in COUNTED;
}

/** Texto del estado bajo «Asistente de IA» en la barra lateral («Listo», «Leyendo 2 de 5…»). */
export function assistantText(status: AssistantStatus, i18n: TextContext): string {
  const { condition, count, total } = status;
  if (condition === "reading") return i18n.t("assistant.status.reading", { done: count, total });
  if (isCounted(condition)) return i18n.tPlural({ key: COUNTED[condition], count });
  return i18n.t(PLAIN[condition]);
}

/** Texto del estado en la barra superior, con el mismo vocabulario que la barra lateral. */
export function assistantTopbarText(status: AssistantStatus, i18n: TextContext): string {
  const key = TOPBAR[status.condition];
  return key ? i18n.t(key) : assistantText(status, i18n);
}
