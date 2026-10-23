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
import { CLOSED_REVIEW } from "../../test/reviewFixtures";
import { REPORT_PARTS, reportDocument, type ReportPart } from "./reportDocument";

const messages = MESSAGES_BY_LOCALE.es;
const texts = {
  t: (key: TranslationKey, params?: TranslationParams) => translate(messages, key, params),
  tPlural: (request: PluralRequest) => translatePlural(messages, "es", request),
  format: createFormatters("es-CO", "es"),
  locale: "es" as const,
};
const GENERATED_AT = new Date("2026-10-23T15:14:00Z");

function build(parts: readonly ReportPart[] = REPORT_PARTS) {
  const request = {
    review: CLOSED_REVIEW,
    parts: new Set(parts),
    version: "0.1.0",
    generatedAt: GENERATED_AT,
  };
  return reportDocument(request, texts);
}

describe("Informe del expediente", () => {
  it("numera las secciones elegidas y firma con la versión de ARGUS", () => {
    const document = build();

    expect(document.title).toBe("Informe de revisión documental");
    expect(document.subtitles).toEqual(["Revisión de prueba", "Revisado el 15/10/2026"]);
    expect(document.sections.map((section) => section.heading)).toEqual([
      "1. Resumen",
      "2. Evidencia",
      "3. Decisiones tomadas",
      "4. Nota sobre sugerencias de IA",
    ]);
    expect(document.footer).toMatch(/^Generado con ARGUS 0\.1\.0 · 23\/10\/2026/);
  });

  it("resume las alertas con su estado y lo que queda pendiente", () => {
    const [summary] = build(["summary"]).sections;

    expect(summary?.metrics.map((metric) => `${metric.value} ${metric.label}`)).toEqual([
      "2 alertas",
      "1 error real",
      "0 correctas",
      "0 ignoradas",
      "1 pendiente",
    ]);
    expect(summary?.paragraphs).toEqual([
      "Se revisaron 2 documentos el 15/10/2026. Se marcaron como error: identificador. Quedan pendientes: nombre.",
    ]);
  });

  it("cada valor de la evidencia lleva su origen y cada decisión su valor correcto", () => {
    const [evidence, decisions] = build(["evidence", "decisions"]).sections;

    expect(evidence?.table?.rows[0]).toEqual([
      { text: "Identificador" },
      { text: "1234", detail: "contrato.txt · Línea 1" },
      { text: "1324", detail: "anexo.pdf · Página 3" },
    ]);
    expect(decisions?.table?.rows).toEqual([
      [
        { text: "Identificador" },
        { text: "Es un error" },
        { text: "Valor correcto: 1234" },
        // La hora depende de la zona del equipo que corre las pruebas.
        { text: texts.format.dateTime(new Date("2026-10-15T10:10:00+00:00")) },
      ],
    ]);
  });
});
