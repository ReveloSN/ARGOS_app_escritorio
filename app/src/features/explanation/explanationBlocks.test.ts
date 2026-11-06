import { describe, expect, it } from "vitest";

import { translate } from "../../i18n/translate";
import { MESSAGES_BY_LOCALE } from "../../i18n/messages";
import {
  ADDED_CHANGE,
  CASE_CHANGE,
  MOVED_CHANGE,
  NEGATION_CHANGE,
  NUMBER_CHANGE,
  REMOVED_ANNEX_CHANGE,
  V3,
} from "../../test/comparisonFakes";
import { changeBlocks, shorten, withAiStructure } from "./explanationBlocks";
import { changeSideValues } from "./sideValues";

const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) =>
  translate(MESSAGES_BY_LOCALE.es, key, params);
const PAIR = { firstDocument: "Contrato_v2.docx", secondDocument: "Contrato_v3.docx" };

describe("bloques de la explicación de un cambio", () => {
  it("la frase resumen dice en lenguaje cotidiano qué falta en el documento B", () => {
    const blocks = changeBlocks(REMOVED_ANNEX_CHANGE, t);

    expect(blocks.summary).toBe("En el documento B falta «Seguros a cargo del arrendatario.».");
  });

  it("un cambio de un valor dice de cuál a cuál", () => {
    expect(changeBlocks(NUMBER_CHANGE, t).summary).toBe(
      "En el documento B, «4857» pasa a ser «4587».",
    );
  });

  it("(regresión) agregar o quitar una palabra lo dice con esa palabra, no con la oración entera", () => {
    const summary = changeBlocks(NEGATION_CHANGE, t).summary;

    expect(summary).toBe("En el documento B se agregó «no».");
    expect(summary).not.toContain(V3[2]?.text);
  });

  it("los tres bloques salen del tema del cambio", () => {
    const blocks = changeBlocks(ADDED_CHANGE, t);

    expect(blocks.changed).toBe("Cambia un monto.");
    expect(blocks.why).toBe("Un valor distinto cambia lo que se paga o se cobra.");
    expect(blocks.todo).toBe(
      "Compare con el valor acordado y corrija el documento que se equivoque.",
    );
    expect(changeBlocks(CASE_CHANGE, t).why).toBe("El sentido es el mismo.");
  });

  it("recorta los textos largos para que la frase se lea de un vistazo", () => {
    const long = "a".repeat(200);

    expect(shorten(long)).toHaveLength(81);
    expect(shorten(long).endsWith("…")).toBe(true);
    expect(shorten("corto")).toBe("corto");
  });

  it("la estructura de la IA reemplaza los bloques; sin ella quedan los locales", () => {
    const local = changeBlocks(NUMBER_CHANGE, t);
    const ai = {
      summary: "Resumen IA",
      whatChanged: "Cambió IA",
      whyItMatters: "Importa IA",
      whatToDo: "Hacer IA",
    };

    expect(withAiStructure(local, null)).toBe(local);
    expect(withAiStructure(local, ai)).toEqual({
      summary: "Resumen IA",
      changed: "Cambió IA",
      why: "Importa IA",
      todo: "Hacer IA",
    });
  });
});

describe("valores lado a lado", () => {
  it("marca la diferencia dentro del texto de cada documento", () => {
    const values = changeSideValues(NUMBER_CHANGE, PAIR);

    expect(values.first.document).toBe("Contrato_v2.docx");
    expect(values.first.runs?.some((run) => run.mark === "changed" && run.text === "4857")).toBe(
      true,
    );
    expect(values.second.runs?.some((run) => run.mark === "changed" && run.text === "4587")).toBe(
      true,
    );
  });

  it("lo que falta en un documento queda sin texto, con el nombre de ese documento", () => {
    const values = changeSideValues(REMOVED_ANNEX_CHANGE, PAIR);

    expect(values.first.runs).not.toBeNull();
    expect(values.second).toEqual({ document: "Contrato_v3.docx", runs: null, location: null });
  });

  it("un texto movido se ve igual en los dos lados", () => {
    const values = changeSideValues(MOVED_CHANGE, PAIR);

    expect(values.first.runs?.every((run) => run.mark === undefined)).toBe(true);
    expect(values.second.runs).not.toBeNull();
  });
});
