import { describe, expect, it } from "vitest";

import { MESSAGES_BY_LOCALE } from "../../i18n/messages";
import { translate, type TranslationKey, type TranslationParams } from "../../i18n/translate";
import { CLOSED_REVIEW, REVIEW } from "../../test/reviewFixtures";
import { shortcutHints } from "./alertShortcutHints";

const t = (key: TranslationKey, params?: TranslationParams) =>
  translate(MESSAGES_BY_LOCALE.es, key, params);

describe("Atajos que anuncia la lista de alertas", () => {
  it("una revisión abierta anuncia decidir y deshacer", () => {
    const keys = shortcutHints(REVIEW, t).flatMap((hint) => hint.keys);

    expect(keys).toEqual(expect.arrayContaining(["C", "E", "I", "Z"]));
  });

  it("(regresión) una revisión cerrada no anuncia atajos que no hacen nada", () => {
    const keys = shortcutHints(CLOSED_REVIEW, t).flatMap((hint) => hint.keys);

    expect(keys).toEqual(expect.arrayContaining(["J", "K"]));
    expect(keys).not.toContain("C");
    expect(keys).not.toContain("Z");
  });
});
