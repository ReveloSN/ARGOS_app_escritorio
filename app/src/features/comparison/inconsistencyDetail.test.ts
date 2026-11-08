import { describe, expect, it } from "vitest";

import { MESSAGES_BY_LOCALE } from "../../i18n/messages";
import { translate, type TranslationKey } from "../../i18n/translate";
import { CONTRACT_ALERT } from "../../test/reviewFixtures";
import { inconsistencyDetail } from "./itemDetails";

const t = (key: TranslationKey, params?: Record<string, string | number>) =>
  translate(MESSAGES_BY_LOCALE.es, key, params);

// CLAUDE.md §7: en el detalle, cada valor dice de qué archivo y de qué lugar sale.
describe("detalle de una inconsistencia", () => {
  it("cada valor lleva su archivo y su ubicación", () => {
    expect(inconsistencyDetail(CONTRACT_ALERT, t).values).toEqual([
      { label: "contrato.txt", value: "1234", location: "Línea 1" },
      { label: "anexo.pdf", value: "1324", location: "Página 3" },
    ]);
  });
});
