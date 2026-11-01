import { describe, expect, it } from "vitest";

import { createFormatters } from "../../i18n/formatters";
import { MESSAGES_BY_LOCALE } from "../../i18n/messages";
import {
  translate,
  translatePlural,
  type PluralRequest,
  type TranslationKey,
  type TranslationParams,
} from "../../i18n/translate";
import { comparison } from "../../test/comparisonFakes";
import { inconsistency } from "../../test/inconsistencyFakes";
import { comparisonReportDocument } from "./comparisonReport";

const messages = MESSAGES_BY_LOCALE.es;
const texts = {
  t: (key: TranslationKey, params?: TranslationParams) => translate(messages, key, params),
  tPlural: (request: PluralRequest) => translatePlural(messages, "es", request),
  format: createFormatters("es-CO", "es"),
  locale: "es" as const,
};
const GENERATED_AT = new Date("2026-10-23T15:14:00Z");

function build(overrides: Parameters<typeof comparison>[0] = {}) {
  const source = comparison({
    inconsistencies: [inconsistency(5)],
    decisions: {
      decisions: [{ alertNumber: 2, kind: "error", correctSide: null, decidedAt: "" }],
      canUndo: true,
    },
    ...overrides,
  });
  return comparisonReportDocument(
    { comparison: source, version: "0.1.0", generatedAt: GENERATED_AT },
    texts,
  );
}

describe("Informe de una comparación", () => {
  it("se redacta con título, nombre, resumen, cambios e inconsistencias numerados", () => {
    const document = build();

    expect(document.title).toBe("Informe de comparación");
    expect(document.subtitles[0]).toBe("Arrendamiento Fontibón");
    expect(document.sections.map((section) => section.heading)).toEqual([
      "1. Resumen",
      "2. Cambios",
      "3. Inconsistencias entre documentos",
    ]);
    expect(document.footer).toContain("0.1.0");
  });

  it("el resumen cuenta cambios, riesgo alto, inconsistencias y decisiones", () => {
    const [summary] = build().sections;

    expect(summary?.metrics.map((metric) => `${metric.value} ${metric.label}`)).toEqual([
      "4 cambios",
      expect.stringMatching(/^\d+ de riesgo alto$/),
      "1 inconsistencia",
      "1 decidido",
    ]);
  });

  it("cada cambio lleva su origen (archivo y ubicación) y su decisión", () => {
    const changes = build().sections[1]?.table;

    expect(changes?.columns).toEqual(["Cambio", "Antes · origen", "Después · origen", "Decisión"]);
    expect(changes?.rows).toHaveLength(4);
    const decisions = changes?.rows.map((row) => row[3]?.text);
    expect(decisions).toEqual(["Pendiente", "Es un error", "Pendiente", "Pendiente"]);
    const before = changes?.rows[0]?.[1];
    expect(before?.detail).toMatch(/\.docx · /);
  });

  it("(regresión) nunca muestra un valor sin su origen", () => {
    const rows = build().sections[1]?.table?.rows ?? [];

    const shown = rows
      .flatMap((row) => [row[1], row[2]])
      .filter((cell) => cell && cell.text !== "—");
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.every((cell) => Boolean(cell?.detail))).toBe(true);
  });

  it("sin inconsistencias ni cambios solo trae el resumen", () => {
    const document = build({ inconsistencies: [], pairs: [] });

    expect(document.sections.map((section) => section.heading)).toEqual(["1. Resumen"]);
  });
});
