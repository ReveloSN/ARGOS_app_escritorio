import { describe, expect, it } from "vitest";

import { MESSAGES_BY_LOCALE } from "../../i18n/messages";
import { translate, type TranslationKey, type TranslationParams } from "../../i18n/translate";
import { describeSegmentLocation } from "./alertPresentation";

const t = (key: TranslationKey, params?: TranslationParams) =>
  translate(MESSAGES_BY_LOCALE.es, key, params);

describe("Dónde está un segmento de una comparación", () => {
  it("(regresión) una fila de tabla se cita entera, no por la columna de su primera celda", () => {
    const row = {
      kind: "table_row",
      location: { kind: "table_cell" as const, table: 1, row: 2, column: 1 },
    };

    expect(describeSegmentLocation(row, t)).toBe("Tabla 1 · fila 2");
  });

  it("(regresión) una fila de hoja dice su fila, no la celda A de la primera columna", () => {
    const row = {
      kind: "table_row",
      location: { kind: "sheet_cell" as const, sheet: "Tarifas", cell: "A2" },
    };

    expect(describeSegmentLocation(row, t)).toBe("Hoja Tarifas · fila 2");
  });

  it("un párrafo o una página se describen como siempre", () => {
    const paragraph = {
      kind: "paragraph",
      location: { kind: "paragraph" as const, paragraph: 4 },
    };

    expect(describeSegmentLocation(paragraph, t)).toBe("Párrafo 4");
  });
});
