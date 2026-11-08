import { describe, expect, it } from "vitest";

import { LOCALES, MESSAGES_BY_LOCALE, type Locale } from "../../i18n/messages";
import { translate, translatePlural } from "../../i18n/translate";
import type { AssistantCondition, AssistantStatus } from "./assistantStatus";
import { assistantText, assistantTopbarText } from "./assistantText";

const CONDITIONS: readonly AssistantCondition[] = [
  "starting",
  "paused",
  "reading",
  "explaining",
  "ready",
  "unreadable",
  "highRisk",
  "needsConfirmation",
  "clear",
];

function i18nFor(locale: Locale) {
  const messages = MESSAGES_BY_LOCALE[locale];
  return {
    t: (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) =>
      translate(messages, key, params),
    tPlural: (request: Parameters<typeof translatePlural>[2]) =>
      translatePlural(messages, locale, request),
  };
}

const statusOf = (condition: AssistantCondition): AssistantStatus => ({
  condition,
  eye: "idle",
  count: 2,
  total: 3,
});

describe.each(LOCALES)("textos del asistente (%s)", (locale) => {
  const i18n = i18nFor(locale);

  // CLAUDE.md §9: vocabulario único. La barra superior añade «Asistente de IA», no otra palabra.
  it.each(CONDITIONS)("«%s» se nombra igual en la barra superior y en la lateral", (condition) => {
    const sidebar = assistantText(statusOf(condition), i18n).toLocaleLowerCase(locale);
    const topbar = assistantTopbarText(statusOf(condition), i18n).toLocaleLowerCase(locale);

    expect(topbar).toContain(sidebar);
  });
});
