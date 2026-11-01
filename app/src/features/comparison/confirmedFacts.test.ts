import { describe, expect, it } from "vitest";

import { confirmedFact } from "../../test/factFakes";
import { inconsistency } from "../../test/inconsistencyFakes";
import { activeFacts, confirmedFactFor } from "./confirmedFacts";
import { inconsistencyColumns, inconsistencyRows } from "./inconsistencyRows";

const ALERT = inconsistency(5);

describe("Datos confirmados como referencia de las inconsistencias", () => {
  it("elige el dato confirmado que dice uno de los valores de la inconsistencia", () => {
    const other = confirmedFact({ id: 2, label: "Otro contrato", value: "9999" });
    const right = confirmedFact({ id: 1, value: "4857" });

    expect(confirmedFactFor(ALERT, [other, right])?.id).toBe(1);
  });

  it("si ninguno coincide pero hay uno solo del mismo tipo, ese es la referencia", () => {
    expect(confirmedFactFor(ALERT, [confirmedFact({ value: "1111" })])?.value).toBe("1111");
  });

  it("(regresión) con varios del mismo tipo y ninguno coincide, no adivina", () => {
    const facts = [
      confirmedFact({ id: 1, value: "1111" }),
      confirmedFact({ id: 2, value: "2222" }),
    ];

    expect(confirmedFactFor(ALERT, facts)).toBeUndefined();
  });

  it("un dato de otro tipo no sirve de referencia", () => {
    expect(confirmedFactFor(ALERT, [confirmedFact({ entityType: "money" })])).toBeUndefined();
  });

  it("los datos retirados no cuentan", () => {
    const retired = confirmedFact({ retiredAt: "2026-10-01T00:00:00+00:00" });

    expect(activeFacts([retired, confirmedFact({ id: 2 })]).map((fact) => fact.id)).toEqual([2]);
  });

  it("(regresión) marca ≠ en el valor que contradice el dato confirmado, no en el de la mayoría", () => {
    const columns = inconsistencyColumns([], [ALERT]);
    const marked = (value: string) =>
      inconsistencyRows([ALERT], columns, () => confirmedFact({ value }))[0]?.cells.flatMap(
        (cell) => (cell?.isOdd ? [cell.value] : []),
      );

    expect(marked("4857")).toEqual(["4587"]);
    expect(marked("4587")).toEqual(["4857", "4857"]);
  });
});
