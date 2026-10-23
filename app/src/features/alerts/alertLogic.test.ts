import { describe, expect, it } from "vitest";

import { createFormatters } from "../../i18n/formatters";
import { MESSAGES_BY_LOCALE } from "../../i18n/messages";
import {
  translate,
  translatePlural,
  type TranslationKey,
  type TranslationParams,
} from "../../i18n/translate";
import type { AlertResult } from "../../services/engine/reviewTypes";
import { CLOSED_REVIEW, CONTRACT_ALERT, NAME_ALERT, REVIEW } from "../../test/reviewFixtures";
import { decidedCount, isReadOnly, pendingCount } from "./alertDecisions";
import {
  activeFacetCount,
  filesOf,
  matchesFilters,
  NO_FILTERS,
  toggleOption,
  type FilterableAlert,
} from "./alertFilters";
import { correctionHint } from "./correctionHint";
import { decisionCardsOf } from "./decisionCards";
import { describeDifference } from "./differenceDescription";

const messages = MESSAGES_BY_LOCALE.es;
const i18n = {
  t: (key: TranslationKey, params?: TranslationParams) => translate(messages, key, params),
  tPlural: (request: Parameters<typeof translatePlural>[2]) =>
    translatePlural(messages, "es", request),
  format: createFormatters("es-CO", "es"),
};

function filterable(alert: AlertResult, searchText = ""): FilterableAlert {
  return { alert, state: "pending", searchText };
}

describe("filtros combinables", () => {
  it("una faceta vacía no filtra y varias facetas se combinan", () => {
    const filters = toggleOption(toggleOption(NO_FILTERS, "risks", "high"), "files", "anexo.pdf");

    expect(activeFacetCount(filters)).toBe(2);
    expect(matchesFilters(filterable(CONTRACT_ALERT), filters)).toBe(true);
    expect(matchesFilters(filterable(NAME_ALERT), filters)).toBe(false);
    expect(matchesFilters(filterable(NAME_ALERT), NO_FILTERS)).toBe(true);
  });

  it("marcar dos veces la misma opción la quita", () => {
    expect(toggleOption(toggleOption(NO_FILTERS, "states", "error"), "states", "error")).toEqual(
      NO_FILTERS,
    );
  });

  it("la búsqueda no distingue mayúsculas ni tildes", () => {
    const filters = { ...NO_FILTERS, query: "PENA" };

    expect(matchesFilters(filterable(NAME_ALERT, "María Rojas Peña"), filters)).toBe(true);
    expect(matchesFilters(filterable(CONTRACT_ALERT, "1234 1324"), filters)).toBe(false);
  });

  it("los archivos de una alerta incluyen los de ambos valores, sin repetir", () => {
    expect(filesOf(CONTRACT_ALERT)).toEqual(["contrato.txt", "acta.txt", "anexo.pdf"]);
  });
});

describe("estado de la revisión", () => {
  it("cuenta decididas y pendientes, y sabe si es de solo lectura", () => {
    expect(pendingCount(REVIEW)).toBe(2);
    expect(decidedCount(CLOSED_REVIEW)).toBe(1);
    expect(isReadOnly(REVIEW)).toBe(false);
    expect(isReadOnly(CLOSED_REVIEW)).toBe(true);
  });
});

describe("descripción de la diferencia", () => {
  it("una transposición nombra las posiciones y los caracteres intercambiados", () => {
    expect(describeDifference(CONTRACT_ALERT, i18n)).toEqual({
      description: "Diferencia: posiciones 2 y 3 intercambiadas",
      change: "2 ↔ 3",
      isHighlighted: true,
    });
  });

  it("un cambio de caracteres muestra cada uno", () => {
    const changed: AlertResult = {
      ...CONTRACT_ALERT,
      differenceKind: "character_change",
      highlightPositions: [4],
      first: { ...CONTRACT_ALERT.first, value: "1234" },
      second: { value: "1235", normalizedValue: "1235", occurrences: [] },
    };

    expect(describeDifference(changed, i18n)).toEqual({
      description: "Diferencia: carácter distinto en la posición 4",
      change: "4 → 5",
      isHighlighted: true,
    });
  });

  it("un nombre parecido se describe por su tipo, sin posiciones", () => {
    expect(describeDifference(NAME_ALERT, i18n)).toEqual({
      description: "Diferencia: nombres parecidos escritos de forma distinta",
      change: undefined,
      isHighlighted: false,
    });
  });

  it("valores de distinto largo no se comparan carácter por carácter", () => {
    const uneven: AlertResult = { ...CONTRACT_ALERT, highlightPositions: [] };

    expect(describeDifference(uneven, i18n).description).toBe(
      "Diferencia: los valores no tienen la misma cantidad de caracteres",
    );
  });
});

describe("sugerencia de corrección", () => {
  it("sin valor elegido, explica que es opcional", () => {
    expect(correctionHint(CONTRACT_ALERT, undefined, i18n)).toBe(
      "Opcional. Ayuda a preparar la corrección.",
    );
  });

  it("con un solo lugar que corregir, dice el archivo y la ubicación", () => {
    expect(correctionHint(CONTRACT_ALERT, "first", i18n)).toBe(
      "Se agregará a correcciones: cambiar 1324 por 1234 en anexo.pdf, Página 3.",
    );
  });

  it("con varios lugares, dice cuántos archivos y apariciones", () => {
    expect(correctionHint(CONTRACT_ALERT, "second", i18n)).toBe(
      "Se agregará a correcciones: cambiar 1234 por 1324 en 2 archivos (2 apariciones).",
    );
  });
});

describe("tarjetas de decisión", () => {
  it("solo las alertas decididas, con el valor correcto si se indicó", () => {
    const [card, ...rest] = decisionCardsOf(CLOSED_REVIEW, i18n);

    expect(rest).toEqual([]);
    expect(card).toMatchObject({
      number: 1,
      decision: "error",
      typeLabel: "Identificador",
      note: "Valor correcto: 1234",
    });
  });
});
