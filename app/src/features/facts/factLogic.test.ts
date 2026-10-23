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
import { confirmedFact, factsResult } from "../../test/factFakes";
import { agreementNotes, rowPresentation } from "./factPresentation";
import { factRows, filterCounts, filterRows } from "./factRows";

const messages = MESSAGES_BY_LOCALE.es;
const texts = {
  t: (key: TranslationKey, params?: TranslationParams) => translate(messages, key, params),
  tPlural: (request: PluralRequest) => translatePlural(messages, "es", request),
  format: createFormatters("es-CO", "es"),
};
const RETIRED = confirmedFact({ id: 2, retiredAt: "2026-10-02T10:00:00+00:00" });
const CLEAN = confirmedFact({ id: 3, contradictions: [] });

describe("Datos confirmados", () => {
  it("cuenta las filas de cada filtro: un retirado no cuenta como contradicho", () => {
    const rows = factRows(factsResult({ facts: [confirmedFact(), RETIRED, CLEAN] }));

    expect(filterCounts(rows)).toEqual({ all: 4, contradicted: 1, pending: 1 });
    expect(filterRows(rows, "pending").map((row) => row.kind)).toEqual(["pending"]);
  });

  it("presenta cada fila con su estado y un valor sin confirmar con sus opciones", () => {
    const [contradicted, retired, pending] = factRows(
      factsResult({ facts: [confirmedFact(), RETIRED] }),
    ).map((row) => rowPresentation(row, texts));

    expect(contradicted).toMatchObject({ statusLabel: "1 lo contradice", statusTone: "high" });
    expect(contradicted?.confirmed).toBe("14/09/2026");
    expect(retired).toMatchObject({ value: "4857 (retirado)", statusLabel: "No se compara" });
    expect(pending).toMatchObject({
      name: "Monto",
      value: "Sin confirmar: $ 18.450.000 y $ 18.540.000",
      isPending: true,
    });
  });

  it("explica por qué ningún documento contradice el dato", () => {
    const accepted = confirmedFact({
      contradictions: [],
      variants: [{ value: "48 57", document: "Correo.eml" }],
      accepted: [{ value: "4587", ruleCreatedAt: "2026-10-02T10:00:00+00:00", occurrences: [] }],
    });

    expect(agreementNotes(accepted, texts)).toEqual([
      "«4587» se acepta por una regla «No alertar casos similares» creada el 02/10/2026.",
      "«48 57» en Correo.eml se acepta como el mismo valor.",
      "El valor coincide en el documento donde aparece.",
    ]);
    expect(agreementNotes(RETIRED, texts)).toEqual([
      "El dato está retirado y no se usa en las comparaciones.",
    ]);
    expect(agreementNotes(confirmedFact({ appearances: [] }), texts)).toEqual([
      "El valor no aparece en los documentos de este expediente.",
    ]);
  });
});
